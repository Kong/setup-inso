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
    ["1.7.0", "1.7.0"],
    ["1.7", "1.7.0"],
    ["1.6", "1.6.0"],
    ["1.6.4", "1.6.4"],
    ["1.8.0-beta2", "1.8.0"],
  ];

  test.each(cases)(
    `accepts a valid semver input (%s)`,
    async (version, expected) => {
      process.env["INPUT_INSO-VERSION"] = version;

      setPlatform("linux");
      mockToolIsInCache(true);
      mockExtraction();

      await action();
      expect(console.log).toBeCalledWith(
        `Installing inso version ${expected}-linux`
      );
    }
  );
});

describe("install", () => {
  it("does not download if the file is in the cache", async () => {
    process.env["INPUT_INSO-VERSION"] = "1.7.0";
    jest.spyOn(core, "addPath");
    jest.spyOn(tc, "downloadTool");

    setPlatform("linux");
    mockToolIsInCache(true);
    mockExtraction();

    await action();

    expect(tc.downloadTool).toBeCalledTimes(0);
    expect(core.addPath).toBeCalledWith("/path/to/inso");
  });

  it("downloads if it is not in the cache", async () => {
    process.env["INPUT_INSO-VERSION"] = "1.7.0";

    setPlatform("linux");
    mockToolIsInCache(false);
    mockTcDownload();
    mockExtraction("tar.xz");

    await action();

    const versionUrl = `https://github.com/Kong/insomnia/releases/download/lib%401.7.0/inso-linux-1.7.0.tar.xz`;

    expect(tc.downloadTool).toBeCalledWith(versionUrl);
    expect(tc.extractTar).toBeCalledWith(
      "./inso-downloaded",
      "inso-1.7.0-linux",
      undefined
    );
    expect(core.addPath).toBeCalledWith("/path/to/extracted/inso");
  });

  it("handles the linux 2.4.0 edge case as expected", async () => {
    process.env["INPUT_INSO-VERSION"] = "2.4.0";

    setPlatform("linux");
    mockToolIsInCache(false);
    mockTcDownload();
    mockExtraction("tar.xz");

    await action();

    const versionUrl = `https://github.com/Kong/insomnia/releases/download/lib%402.4.0/inso-linux-2.4.0.tar.xz`;

    expect(tc.downloadTool).toBeCalledWith(versionUrl);
    expect(tc.extractTar).toBeCalledWith(
      "./inso-downloaded",
      "inso-2.4.0-linux",
      "x"
    );
    expect(core.addPath).toBeCalledWith("/path/to/extracted/inso");
  });

  const osCases = [
    ["linux", "linux", "tar.xz"],
    ["win32", "windows", "zip"],
    ["darwin", "macos", "zip"],
  ];

  test.each(osCases)(
    "downloads correctly for %s",
    async (platform, os, compression) => {
      process.env["INPUT_INSO-VERSION"] = "1.7";

      setPlatform(platform);
      mockToolIsInCache(false);
      mockTcDownload();
      mockExtraction(compression);

      await action();

      expect(tc.downloadTool).toBeCalledWith(
        `https://github.com/Kong/insomnia/releases/download/lib%401.7.0/inso-${os}-1.7.0.${compression}`
      );
    }
  );
});

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
