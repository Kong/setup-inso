const tc = require("@actions/tool-cache");
const core = require("@actions/core");
const semver = require("semver");
const createWrapper = require("actions-output-wrapper");

async function action() {
  let version = core.getInput("inso-version", { required: true });

  const semverVersion = semver.valid(semver.parse(version));

  if (!semverVersion) {
    throw new Error(`Invalid version provided: '${version}'`);
  }

  let os = getPlatform(process.platform);
  let arch = getArch();
  let compression = getCompression(process.platform);

  if (os == "linux") {
    os = os + "-" + arch;
  }

  const fullVersion = `${os}-${semverVersion}`;
  console.log(`Installing inso version ${fullVersion}`);

  let insoDirectory = tc.find("inso", fullVersion);
  if (!insoDirectory) {
    if (os == "linux") {
      os = os + "-" + arch;
    }
    const versionUrl = `https://github.com/Kong/insomnia/releases/download/core%40${semverVersion}/inso-${fullVersion}.${compression}`;
    const insoPath = await tc.downloadTool(versionUrl);

    const extractMethod =
      compression === "tar.xz" ? "extractTar" : "extractZip";
    let additionalOptions = extractMethod == "extractTar" ? "x" : null;

    const insoExtractedFolder = await tc[extractMethod](
      insoPath,
      `inso-${fullVersion}.${compression}`,
      additionalOptions
    );

    insoDirectory = await tc.cacheDir(insoExtractedFolder, "inso", fullVersion);
  }

  core.addPath(insoDirectory);
  if (core.getInput("wrapper") === "true") {
    await createWrapper({
      originalName: "inso",
    });
  }
}

function getCompression(platform) {
  if (platform === "win32") {
    return "zip";
  }

  if (platform === "darwin") {
    return "zip";
  }

  return "tar.xz";
}

function getPlatform(platform) {
  if (platform === "win32") {
    return "windows";
  }

  if (platform === "darwin") {
    return "macos";
  }

  return "linux";
}

function getArch() {
  return process.arch;
}

if (require.main === module) {
  action();
}

module.exports = action;
