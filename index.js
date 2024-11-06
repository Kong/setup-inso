const tc = require("@actions/tool-cache");
const core = require("@actions/core");
const semver = require("semver");
const createWrapper = require("actions-output-wrapper");

async function action() {
  const version = core.getInput("inso-version", { required: true });
  const semverVersion = semver.valid(semver.parse(version));

  if (!semverVersion) {
    throw new Error(`Invalid version provided: '${version}'`);
  }

  let os = getPlatform(process.platform);
  let compression = getCompression(process.platform);
  const fullVersion = `${semverVersion}-${os}`;
  console.log(`Installing inso version ${fullVersion}`);

  let insoDirectory = tc.find("inso", fullVersion);
  if (!insoDirectory) {
    const isHigherThan9Point3 = semver.major(version) < 2000 && semver.compare(version, '9.3.0') >= 0
    const prefix = isHigherThan9Point3 ? "core" : "lib";
    const versionUrl = `https://github.com/Kong/insomnia/releases/download/${prefix}%40${semverVersion}/inso-${os}-${semverVersion}.${compression}`;
    console.log('url:', versionUrl);
    const insoPath = await tc.downloadTool(versionUrl);

    const extractMethod =
      compression === "tar.xz" ? "extractTar" : "extractZip";

    let compressionMode = core.getInput("compression");
    const compressionFlags = {
      gzip: "xz",
      bzip: "x",
      xz: "xJ",
    };

    if (compression === "tar.xz") {
      // Guess the compression mode based on version
      if (fullVersion[0] == "2" && !compressionMode) {
        console.log(`v2 detected, setting gzip compression`);
        compressionMode = "gzip";
      } else if (fullVersion[0] == "3" && !compressionMode) {
        console.log(`v3 detected, setting bzip compression`);
        compressionMode = "bzip";
      } else if (semver.valid(semverVersion) && semver.gt(semverVersion, '4.0.0')) {
        // https://github.com/Kong/insomnia/pull/4192
        console.log(`4.0.0+ and linux detected, setting xz compression`);
        compressionMode = "xz";
      }
    }

    // Edge case handling for inso 2.4.0 on Linux
    let additionalOptions;
    if (fullVersion === "2.4.0-linux") {
      console.log(`${fullVersion} detected - switching to bzip compression`);
      // The archive is bzip compressed, not gzip so we need x rather than xz
      // We'd usually use xf but the -f flag is added by GH Actions
      additionalOptions = "x";
    }

    // If there's an explicit compression mode, use that
    if (compressionFlags[compressionMode]) {
      console.log(
        `${compressionMode} compression enabled - using flags [${compressionFlags[compressionMode]}]`
      );
      additionalOptions = compressionFlags[compressionMode];
    }

    const insoExtractedFolder = await tc[extractMethod](
      insoPath,
      `inso-${fullVersion}`,
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

if (require.main === module) {
  action();
}

module.exports = action;
