const PLUGIN_NAME = "cp-visual-regression-diff";
const LINK_PREFIX = `#${PLUGIN_NAME}-`;
const OVERLAY_CLASS = `${PLUGIN_NAME}-overlay`;
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

export { FILE_SUFFIX, IMAGE_SNAPSHOT_PREFIX, LINK_PREFIX, METADATA_KEY, OVERLAY_CLASS, PATH_VARIABLES, TASK, WINDOWS_LIKE_DRIVE_REGEX };
//# sourceMappingURL=constants.mjs.map
