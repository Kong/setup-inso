const action = require("./index");
const tc = require("@actions/tool-cache");
const core = require("@actions/core");
jest.mock("actions-output-wrapper");
let createWrapper = require("actions-output-wrapper");

let originalPlatform;
beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation();
  createWrapper.mockClear();
  originalPlatform = process.platform;
});

afterEach(() => {
  jest.restoreAllMocks();
  setPlatform(originalPlatform);
});

describe("version parsing", () => {
  it("throws when no version is provided", async () => {
    expect(action).rejects.toThrow(
      "Input required and not supplied: inso-version"
    );
  });

  it("throws when an invalid version is provided", async () => {
    process.env["INPUT_INSO-VERSION"] = "banana";
    expect(action).rejects.toThrow("Invalid version provided: 'banana'");
  });

  const cases = [
    ["1.7.0", "linux-x64-1.7.0"],
    ["1.6.4", "linux-x64-1.6.4"],
    ["1.8.0-beta2", "linux-x64-1.8.0-beta2"],
  ];

  test.each(cases)(
    `accepts a valid semver input (%s)`,
    async (version, expected) => {
      process.env["INPUT_INSO-VERSION"] = version;

      setPlatform("linux");
      setArch("x64");
      mockToolIsInCache(true);
      mockExtraction();

      await action();
      expect(console.log).toBeCalledWith(`Installing inso version ${expected}`);
    }
  );
});

describe("install", () => {
  it("does not download if the file is in the cache", async () => {
    process.env["INPUT_INSO-VERSION"] = "10.3.1";
    jest.spyOn(core, "addPath");
    jest.spyOn(tc, "downloadTool");

    setPlatform("linux");
    setArch("x64");
    mockToolIsInCache(true);
    mockExtraction();

    await action();

    expect(tc.downloadTool).toBeCalledTimes(0);
    expect(core.addPath).toBeCalledWith("/path/to/inso");
  });

  const osCases = [
    ["inso-linux-x64-10.3.1", "tar.xz", "linux", "extractTar", "x"],
    ["inso-macos-10.3.1", "zip", "darwin", "extractZip", null],
  ];

  test.each(osCases)(
    "downloads if it is not in the cache (%s)",
    async (name, format, platform, method, flags) => {
      process.env["INPUT_INSO-VERSION"] = "10.3.1";

      setPlatform(platform);
      setArch("x64");
      mockToolIsInCache(false);
      mockTcDownload();
      mockExtraction(format);

      await action();

      const versionUrl = `https://github.com/Kong/insomnia/releases/download/core%4010.3.1/${name}.${format}`;

      expect(tc.downloadTool).toBeCalledWith(versionUrl);
      expect(tc[method]).toBeCalledWith(
        "./inso-downloaded",
        `${name}.${format}`,
        flags
      );
      expect(core.addPath).toBeCalledWith("/path/to/extracted/inso");
    }
  );
});

const osCases = [
  ["linux", "x64", "linux-x64", "tar.xz"],
  ["linux", "arm64", "linux-arm64", "tar.xz"],
  ["win32", null, "windows", "zip"],
  ["darwin", null, "macos", "zip"],
];

test.each(osCases)(
  "downloads correctly for %s",
  async (platform, arch, os, compression) => {
    process.env["INPUT_INSO-VERSION"] = "10.3.1";

    setPlatform(platform);
    if (arch) {
      setArch(arch);
    }
    mockToolIsInCache(false);
    mockTcDownload();
    mockExtraction(compression);

    await action();

    expect(tc.downloadTool).toBeCalledWith(
      `https://github.com/Kong/insomnia/releases/download/core%4010.3.1/inso-${os}-10.3.1.${compression}`
    );
  }
);

describe("wrapper", () => {
  it("does not apply the wrapper by default", async () => {
    process.env["INPUT_INSO-VERSION"] = "1.7.0";
    process.env["INPUT_WRAPPER"] = "false";

    setPlatform("linux");
    mockToolIsInCache(true);
    mockExtraction();

    await action();

    expect(createWrapper).toBeCalledTimes(0);
  });

  it("applies the wrapper when enabled", async () => {
    process.env["INPUT_INSO-VERSION"] = "1.7.0";
    process.env["INPUT_WRAPPER"] = "true";

    setPlatform("linux");
    mockToolIsInCache(true);
    mockExtraction();

    await action();

    expect(createWrapper).toBeCalledTimes(1);
  });
});

function mockToolIsInCache(exists) {
  const path = exists ? "/path/to/inso" : "";
  jest.spyOn(tc, "find").mockImplementationOnce(() => path);
}

function setPlatform(platform) {
  Object.defineProperty(process, "platform", {
    value: platform,
  });
}

function setArch(arch) {
  Object.defineProperty(process, "arch", {
    value: arch,
  });
}

function mockTcDownload() {
  jest
    .spyOn(tc, "downloadTool")
    .mockImplementationOnce(() => "./inso-downloaded");
}

function mockTcExtractTar() {
  jest
    .spyOn(tc, "extractTar")
    .mockImplementationOnce(() => "./inso-extracted-local");
}

function mockTcExtractZip() {
  jest
    .spyOn(tc, "extractZip")
    .mockImplementationOnce(() => "./inso-extracted-local");
}

function mockTcCacheDir() {
  jest
    .spyOn(tc, "cacheDir")
    .mockImplementationOnce(() => "/path/to/extracted/inso");
}

function mockCoreAddPath() {
  jest.spyOn(core, "addPath").mockImplementationOnce(() => {});
}

function mockExtraction(compression) {
  if (compression == "tar.xz") {
    mockTcExtractTar();
  } else {
    mockTcExtractZip();
  }
  mockTcCacheDir();
  mockCoreAddPath();
}
