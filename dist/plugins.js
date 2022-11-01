var fs = require('fs');
var pngjs = require('pngjs');
var pixelmatch = require('pixelmatch');
var moveFile = require('move-file');
var path = require('path');
var sharp = require('sharp');
var metaPng = require('meta-png');
var glob = require('glob');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
var pixelmatch__default = /*#__PURE__*/_interopDefaultLegacy(pixelmatch);
var moveFile__default = /*#__PURE__*/_interopDefaultLegacy(moveFile);
var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var sharp__default = /*#__PURE__*/_interopDefaultLegacy(sharp);
var glob__default = /*#__PURE__*/_interopDefaultLegacy(glob);

const PLUGIN_NAME = "cp-visual-regression-diff";
const IMAGE_SNAPSHOT_PREFIX = `__${PLUGIN_NAME}_snapshots__`;
var FILE_SUFFIX;

(function (FILE_SUFFIX) {
  FILE_SUFFIX["diff"] = ".diff";
  FILE_SUFFIX["actual"] = ".actual";
})(FILE_SUFFIX || (FILE_SUFFIX = {}));

const TASK = {
  getScreenshotPathInfo: `${PLUGIN_NAME}-getScreenshotPathInfo`,
  compareImages: `${PLUGIN_NAME}-compareImages`,
  approveImage: `${PLUGIN_NAME}-approveImage`,
  cleanupImages: `${PLUGIN_NAME}-cleanupImages`,
  doesFileExist: `${PLUGIN_NAME}-doesFileExist`
  /* c8 ignore next */

};
const PATH_VARIABLES = {
  specPath: "{spec_path}",
  unixSystemRootPath: "{unix_system_root_path}",
  winSystemRootPath: "{win_system_root_path}"
};
const WINDOWS_LIKE_DRIVE_REGEX = /^[A-Z]:$/;
const METADATA_KEY = "FRSOURCE_CPVRD_V";

var version = "3.0.1";

function isHighSurrogate(codePoint) {
  return codePoint >= 0xd800 && codePoint <= 0xdbff;
}

function isLowSurrogate(codePoint) {
  return codePoint >= 0xdc00 && codePoint <= 0xdfff;
}

// Truncate string by size in bytes
var truncate = function truncate(getLength, string, byteLength) {
  if (typeof string !== "string") {
    throw new Error("Input must be string");
  }

  var charLength = string.length;
  var curByteLength = 0;
  var codePoint;
  var segment;

  for (var i = 0; i < charLength; i += 1) {
    codePoint = string.charCodeAt(i);
    segment = string[i];

    if (isHighSurrogate(codePoint) && isLowSurrogate(string.charCodeAt(i + 1))) {
      i += 1;
      segment += string[i];
    }

    curByteLength += getLength(segment);

    if (curByteLength === byteLength) {
      return string.slice(0, i + 1);
    }
    else if (curByteLength > byteLength) {
      return string.slice(0, i - segment.length + 1);
    }
  }

  return string;
};

var getLength = Buffer.byteLength.bind(Buffer);
var truncateUtf8Bytes = truncate.bind(null, getLength);

/*jshint node:true*/

/**
 * Replaces characters in strings that are illegal/unsafe for filenames.
 * Unsafe characters are either removed or replaced by a substitute set
 * in the optional `options` object.
 *
 * Illegal Characters on Various Operating Systems
 * / ? < > \ : * | "
 * https://kb.acronis.com/content/39790
 *
 * Unicode Control codes
 * C0 0x00-0x1f & C1 (0x80-0x9f)
 * http://en.wikipedia.org/wiki/C0_and_C1_control_codes
 *
 * Reserved filenames on Unix-based systems (".", "..")
 * Reserved filenames in Windows ("CON", "PRN", "AUX", "NUL", "COM1",
 * "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
 * "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", and
 * "LPT9") case-insesitively and with or without filename extensions.
 *
 * Capped at 255 characters in length.
 * http://unix.stackexchange.com/questions/32795/what-is-the-maximum-allowed-filename-and-folder-size-with-ecryptfs
 *
 * @param  {String} input   Original filename
 * @param  {Object} options {replacement: String | Function }
 * @return {String}         Sanitized filename
 */



var illegalRe = /[\/\?<>\\:\*\|"]/g;
var controlRe = /[\x00-\x1f\x80-\x9f]/g;
var reservedRe = /^\.+$/;
var windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
var windowsTrailingRe = /[\. ]+$/;

function sanitize(input, replacement) {
  if (typeof input !== 'string') {
    throw new Error('Input must be string');
  }
  var sanitized = input
    .replace(illegalRe, replacement)
    .replace(controlRe, replacement)
    .replace(reservedRe, replacement)
    .replace(windowsReservedRe, replacement)
    .replace(windowsTrailingRe, replacement);
  return truncateUtf8Bytes(sanitized, 255);
}

var sanitizeFilename = function (input, options) {
  var replacement = (options && options.replacement) || '';
  var output = sanitize(input, replacement);
  if (replacement === '') {
    return output;
  }
  return sanitize(output, '');
};

const nameCacheCounter = {};
const generateScreenshotPath = ({
  titleFromOptions,
  imagesPath,
  specPath
}) => {
  const parsePathPartVariables = (pathPart, i) => {
    if (pathPart === PATH_VARIABLES.specPath) {
      return path__default["default"].dirname(specPath);
    } else if (i === 0 && !pathPart) {
      // when unix-like absolute path
      return PATH_VARIABLES.unixSystemRootPath;
    } else if (i === 0 && WINDOWS_LIKE_DRIVE_REGEX.test(pathPart)) {
      // when win-like absolute path
      return path__default["default"].join(PATH_VARIABLES.winSystemRootPath, pathPart[0]);
    }

    return pathPart;
  };

  const screenshotPath = path__default["default"].join(...imagesPath.split("/").map(parsePathPartVariables), sanitizeFilename(titleFromOptions));

  if (typeof nameCacheCounter[screenshotPath] === "undefined") {
    nameCacheCounter[screenshotPath] = -1;
  }

  return path__default["default"].join(IMAGE_SNAPSHOT_PREFIX, `${screenshotPath} #${++nameCacheCounter[screenshotPath]}${FILE_SUFFIX.actual}.png`);
};
const screenshotPathRegex = new RegExp(`^([\\s\\S]+?) #([0-9]+)(?:(?:\\${FILE_SUFFIX.diff})|(?:\\${FILE_SUFFIX.actual}))?\\.(?:png|PNG)$`);
const wasScreenshotUsed = imagePath => {
  const matched = imagePath.match(screenshotPathRegex);
  /* c8 ignore next */

  if (!matched) return false;
  const [, screenshotPath, numString] = matched;
  const num = parseInt(numString);
  /* c8 ignore next */

  if (!screenshotPath || isNaN(num)) return false;
  return screenshotPath in nameCacheCounter && num <= nameCacheCounter[screenshotPath];
};
const resetScreenshotNameCache = () => {
  Object.keys(nameCacheCounter).forEach(k => delete nameCacheCounter[k]);
};

const addPNGMetadata = png => metaPng.addMetadata(png, METADATA_KEY, version
/* c8 ignore next */
);
const getPNGMetadata = png => metaPng.getMetadata(png, METADATA_KEY
/* c8 ignore next */
);
const isImageCurrentVersion = png => getPNGMetadata(png) === version;
const isImageGeneratedByPlugin = png => !!getPNGMetadata(png
/* c8 ignore next */
);
const writePNG = (name, png) => fs__default["default"].writeFileSync(name, addPNGMetadata(png instanceof pngjs.PNG ? pngjs.PNG.sync.write(png) : png));

const inArea = (x, y, height, width) => y > height || x > width;

const fillSizeDifference = (image, width, height) => {
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (inArea(x, y, height, width)) {
        const idx = image.width * y + x << 2;
        image.data[idx] = 0;
        image.data[idx + 1] = 0;
        image.data[idx + 2] = 0;
        image.data[idx + 3] = 64;
      }
    }
  }

  return image;
  /* c8 ignore next */
};
const createImageResizer = (width, height) => source => {
  const resized = new pngjs.PNG({
    width,
    height,
    fill: true
  });
  pngjs.PNG.bitblt(source, resized, 0, 0, source.width, source.height, 0, 0);
  return resized;
  /* c8 ignore next */
};
const scaleImageAndWrite = async ({
  scaleFactor,
  path
}) => {
  const imgBuffer = fs__default["default"].readFileSync(path);
  if (scaleFactor === 1) return imgBuffer;
  const rawImgNew = pngjs.PNG.sync.read(imgBuffer);
  const newImageWidth = Math.ceil(rawImgNew.width * scaleFactor);
  const newImageHeight = Math.ceil(rawImgNew.height * scaleFactor);
  await sharp__default["default"](imgBuffer).resize(newImageWidth, newImageHeight).toFile(path);
  return fs__default["default"].readFileSync(path);
};
const alignImagesToSameSize = (firstImage, secondImage) => {
  const firstImageWidth = firstImage.width;
  const firstImageHeight = firstImage.height;
  const secondImageWidth = secondImage.width;
  const secondImageHeight = secondImage.height;
  const resizeToSameSize = createImageResizer(Math.max(firstImageWidth, secondImageWidth), Math.max(firstImageHeight, secondImageHeight));
  const resizedFirst = resizeToSameSize(firstImage);
  const resizedSecond = resizeToSameSize(secondImage);
  return [fillSizeDifference(resizedFirst, firstImageWidth, firstImageHeight), fillSizeDifference(resizedSecond, secondImageWidth, secondImageHeight)];
};
const cleanupUnused = rootPath => {
  glob__default["default"].sync("**/*.png", {
    cwd: rootPath,
    ignore: "node_modules/**/*"
  }).forEach(pngPath => {
    const absolutePath = path__default["default"].join(rootPath, pngPath);

    if (!wasScreenshotUsed(pngPath) && isImageGeneratedByPlugin(fs__default["default"].readFileSync(absolutePath))) {
      fs__default["default"].unlinkSync(absolutePath);
    }
  });
};

const round = n => Math.ceil(n * 1000) / 1000;

const unlinkSyncSafe = path => fs__default["default"].existsSync(path) && fs__default["default"].unlinkSync(path);

const moveSyncSafe = (pathFrom, pathTo) => fs__default["default"].existsSync(pathFrom) && moveFile__default["default"].sync(pathFrom, pathTo);

const getScreenshotPathInfoTask = cfg => {
  const screenshotPath = generateScreenshotPath(cfg);
  return {
    screenshotPath,
    title: path__default["default"].basename(screenshotPath, ".png")
  };
};
const cleanupImagesTask = config => {
  if (config.env["pluginVisualRegressionCleanupUnusedImages"]) {
    cleanupUnused(config.projectRoot);
  }

  resetScreenshotNameCache();
  return null;
};
const approveImageTask = ({
  img
}) => {
  const oldImg = img.replace(FILE_SUFFIX.actual, "");
  unlinkSyncSafe(oldImg);
  const diffImg = img.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff);
  unlinkSyncSafe(diffImg);
  moveSyncSafe(img, oldImg);
  return null;
};
const compareImagesTask = async cfg => {
  const messages = [];
  const rawImgNewBuffer = await scaleImageAndWrite({
    scaleFactor: cfg.scaleFactor,
    path: cfg.imgNew
  });
  let imgDiff;
  let imgNewBase64, imgOldBase64, imgDiffBase64;
  let error = false;

  if (fs__default["default"].existsSync(cfg.imgOld) && !cfg.updateImages) {
    const rawImgNew = pngjs.PNG.sync.read(rawImgNewBuffer);
    const rawImgOldBuffer = fs__default["default"].readFileSync(cfg.imgOld);
    const rawImgOld = pngjs.PNG.sync.read(rawImgOldBuffer);
    const isImgSizeDifferent = rawImgNew.height !== rawImgOld.height || rawImgNew.width !== rawImgOld.width;
    const [imgNew, imgOld] = isImgSizeDifferent ? alignImagesToSameSize(rawImgNew, rawImgOld) : [rawImgNew, rawImgOld];
    const {
      width,
      height
    } = imgNew;
    const diff = new pngjs.PNG({
      width,
      height
    });
    const diffConfig = Object.assign({
      includeAA: true
    }, cfg.diffConfig);
    const diffPixels = pixelmatch__default["default"](imgNew.data, imgOld.data, diff.data, width, height, diffConfig);
    imgDiff = diffPixels / (width * height);

    if (isImgSizeDifferent) {
      messages.push(`Warning: Images size mismatch - new screenshot is ${rawImgNew.width}px by ${rawImgNew.height}px while old one is ${rawImgOld.width}px by ${rawImgOld.height} (width x height).`);
    }

    if (imgDiff > cfg.maxDiffThreshold) {
      messages.unshift(`Image diff factor (${round(imgDiff)}%) is bigger than maximum threshold option ${cfg.maxDiffThreshold}.`);
      error = true;
    }

    const diffBuffer = pngjs.PNG.sync.write(diff);
    imgNewBase64 = pngjs.PNG.sync.write(imgNew).toString("base64");
    imgDiffBase64 = diffBuffer.toString("base64");
    imgOldBase64 = pngjs.PNG.sync.write(imgOld).toString("base64");

    if (error) {
      writePNG(cfg.imgNew.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff), diffBuffer);
      return {
        error,
        message: messages.join("\n"),
        imgDiff,
        imgNewBase64,
        imgDiffBase64,
        imgOldBase64,
        maxDiffThreshold: cfg.maxDiffThreshold
      };
    } else {
      if (rawImgOld && !isImageCurrentVersion(rawImgOldBuffer)) {
        writePNG(cfg.imgNew, rawImgNewBuffer);
        moveFile__default["default"].sync(cfg.imgNew, cfg.imgOld);
      } else {
        // don't overwrite file if it's the same (imgDiff < cfg.maxDiffThreshold && !isImgSizeDifferent)
        fs__default["default"].unlinkSync(cfg.imgNew);
      }
    }
  } else {
    // there is no "old screenshot" or screenshots should be immediately updated
    imgDiff = 0;
    imgNewBase64 = "";
    imgDiffBase64 = "";
    imgOldBase64 = "";
    writePNG(cfg.imgNew, rawImgNewBuffer);
    moveFile__default["default"].sync(cfg.imgNew, cfg.imgOld);
  }

  if (typeof imgDiff !== "undefined") {
    messages.unshift(`Image diff factor (${round(imgDiff)}%) is within boundaries of maximum threshold option ${cfg.maxDiffThreshold}.`);
    return {
      message: messages.join("\n"),
      imgDiff,
      imgNewBase64,
      imgDiffBase64,
      imgOldBase64,
      maxDiffThreshold: cfg.maxDiffThreshold
    };
  }
  /* c8 ignore next */


  return null;
};
const doesFileExistTask = ({
  path
}) => fs__default["default"].existsSync(path);
/* c8 ignore start */

const initTaskHook = config => ({
  [TASK.getScreenshotPathInfo]: getScreenshotPathInfoTask,
  [TASK.cleanupImages]: cleanupImagesTask.bind(undefined, config),
  [TASK.doesFileExist]: doesFileExistTask,
  [TASK.approveImage]: approveImageTask,
  [TASK.compareImages]: compareImagesTask
});
/* c8 ignore stop */

const MIMIC_ROOT_WIN_REGEX = new RegExp(`^${PATH_VARIABLES.winSystemRootPath}\\${path__default["default"].sep}([A-Z])\\${path__default["default"].sep}`);
const MIMIC_ROOT_UNIX_REGEX = new RegExp(`^${PATH_VARIABLES.unixSystemRootPath}\\${path__default["default"].sep}`);

const getConfigVariableOrThrow = (config, name) => {
  if (config[name]) {
    return config[name];
  }
  /* c8 ignore start */


  throw `[@frsource/cypress-plugin-visual-regression-diff] CypressConfig.${name} cannot be missing or \`false\`!`;
};
/* c8 ignore stop */


const parseAbsolutePath = ({
  screenshotPath,
  projectRoot
}) => {
  let newAbsolutePath;
  const matchedMimicingWinRoot = screenshotPath.match(MIMIC_ROOT_WIN_REGEX);
  const matchedMimicingUnixRoot = screenshotPath.match(MIMIC_ROOT_UNIX_REGEX);

  if (matchedMimicingWinRoot && matchedMimicingWinRoot[1]) {
    const driveLetter = matchedMimicingWinRoot[1];
    newAbsolutePath = path__default["default"].join(`${driveLetter}:\\`, screenshotPath.substring(matchedMimicingWinRoot[0].length));
  } else if (matchedMimicingUnixRoot) {
    newAbsolutePath = path__default["default"].sep + screenshotPath.substring(matchedMimicingUnixRoot[0].length);
  } else {
    newAbsolutePath = path__default["default"].join(projectRoot, screenshotPath);
  }

  return path__default["default"].normalize(newAbsolutePath);
};
const initAfterScreenshotHook = config => details => {
  var _details$name;

  // it's not a screenshot generated by FRSOURCE Cypress Plugin Visual Regression Diff

  /* c8 ignore start */
  if (((_details$name = details.name) == null ? void 0 : _details$name.indexOf(IMAGE_SNAPSHOT_PREFIX)) !== 0) return;
  /* c8 ignore stop */

  const screenshotsFolder = getConfigVariableOrThrow(config, "screenshotsFolder");
  const screenshotPath = details.name.substring(IMAGE_SNAPSHOT_PREFIX.length + path__default["default"].sep.length);
  const newAbsolutePath = parseAbsolutePath({
    screenshotPath,
    projectRoot: config.projectRoot
  });
  return (async () => {
    await moveFile__default["default"](details.path, newAbsolutePath);
    await fs.promises.rm(path__default["default"].join(screenshotsFolder, IMAGE_SNAPSHOT_PREFIX), {
      recursive: true,
      force: true
    });
    return {
      path: newAbsolutePath
    };
  })();
};

/* c8 ignore start */

const initForceDeviceScaleFactor = on => {
  // based on https://github.com/cypress-io/cypress/issues/2102#issuecomment-521299946
  on("before:browser:launch", (browser, launchOptions) => {
    if (browser.name === "chrome" || browser.name === "chromium") {
      launchOptions.args.push("--force-device-scale-factor=1");
      launchOptions.args.push("--high-dpi-support=1");
    } else if (browser.name === "electron" && browser.isHeaded) {
      // eslint-disable-next-line no-console
      console.log("There isn't currently a way of setting the device scale factor in Cypress when running headed electron so we disable the image regression commands.");
    }
  });
};
/* c8 ignore stop */


const initPlugin = (on, config) => {
  /* c8 ignore start */
  if (config.env["pluginVisualRegressionForceDeviceScaleFactor"] !== false) {
    initForceDeviceScaleFactor(on);
  }
  /* c8 ignore stop */


  on("task", initTaskHook(config));
  on("after:screenshot", initAfterScreenshotHook(config));
};

exports.initPlugin = initPlugin;
//# sourceMappingURL=plugins.js.map
