const PLUGIN_NAME = "cp-visual-regression-diff";
const LINK_PREFIX = `#${PLUGIN_NAME}-`;
const OVERLAY_CLASS = `${PLUGIN_NAME}-overlay`;
const IMAGE_SNAPSHOT_PREFIX = `__${PLUGIN_NAME}_snapshots__`;
exports.FILE_SUFFIX = void 0;

(function (FILE_SUFFIX) {
  FILE_SUFFIX["diff"] = ".diff";
  FILE_SUFFIX["actual"] = ".actual";
})(exports.FILE_SUFFIX || (exports.FILE_SUFFIX = {}));

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

exports.IMAGE_SNAPSHOT_PREFIX = IMAGE_SNAPSHOT_PREFIX;
exports.LINK_PREFIX = LINK_PREFIX;
exports.METADATA_KEY = METADATA_KEY;
exports.OVERLAY_CLASS = OVERLAY_CLASS;
exports.PATH_VARIABLES = PATH_VARIABLES;
exports.TASK = TASK;
exports.WINDOWS_LIKE_DRIVE_REGEX = WINDOWS_LIKE_DRIVE_REGEX;
//# sourceMappingURL=constants.js.map
