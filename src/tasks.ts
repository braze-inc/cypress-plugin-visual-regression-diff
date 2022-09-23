import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import moveFile from "move-file";
import sanitize from "sanitize-filename";
import { FILE_SUFFIX, IMAGE_SNAPSHOT_PREFIX, TASK } from "./constants";
import { alignImagesToSameSize, importAndScaleImage } from "./image.utils";

type CompareImagesCfg = {
  scaleFactor: number;
  title: string;
  imgNew: string;
  imgOld: string;
  updateImages: boolean;
  maxDiffThreshold: number;
  diffConfig: Parameters<typeof pixelmatch>[5];
} & Parameters<typeof pixelmatch>[5];

const round = (n: number) => Math.ceil(n * 1000) / 1000;

const initGetScreenshotPathTask: () => Cypress.Tasks = () => ({
  [TASK.getScreenshotPath]({ title, imagesDir, specPath }) {
    return path.join(
      IMAGE_SNAPSHOT_PREFIX,
      path.dirname(specPath),
      ...imagesDir.split("/"),
      `${sanitize(title)}${FILE_SUFFIX.actual}.png`
    );
  },
});

const initApproveImageTask: () => Cypress.Tasks = () => ({
  [TASK.approveImage]({ img }) {
    const oldImg = img.replace(FILE_SUFFIX.actual, "");
    if (fs.existsSync(oldImg)) fs.unlinkSync(oldImg);

    const diffImg = img.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff);
    if (fs.existsSync(diffImg)) fs.unlinkSync(diffImg);

    if (fs.existsSync(img)) moveFile.sync(img, oldImg);

    return null;
  },
});

const initCompareImagesTask = () => ({
  async [TASK.compareImages](cfg: CompareImagesCfg): Promise<null | {
    error?: boolean;
    message?: string;
    imgDiff?: number;
    maxDiffThreshold?: number;
  }> {
    const messages = [] as string[];
    let imgDiff: number | undefined;
    let error = false;

    if (fs.existsSync(cfg.imgOld) && !cfg.updateImages) {
      const rawImgNew = await importAndScaleImage({
        scaleFactor: cfg.scaleFactor,
        path: cfg.imgNew,
      });
      const rawImgOld = PNG.sync.read(fs.readFileSync(cfg.imgOld));
      const isImgSizeDifferent =
        rawImgNew.height !== rawImgOld.height ||
        rawImgNew.width !== rawImgOld.width;

      const [imgNew, imgOld] = isImgSizeDifferent
        ? alignImagesToSameSize(rawImgNew, rawImgOld)
        : [rawImgNew, rawImgOld];

      const { width, height } = imgNew;
      const diff = new PNG({ width, height });
      const diffConfig = Object.assign({ includeAA: true }, cfg.diffConfig);

      const diffPixels = pixelmatch(
        imgNew.data,
        imgOld.data,
        diff.data,
        width,
        height,
        diffConfig
      );
      imgDiff = diffPixels / (width * height);

      if (isImgSizeDifferent) {
        messages.push(
          `Warning: Images size mismatch - new screenshot is ${rawImgNew.width}px by ${rawImgNew.height}px while old one is ${rawImgOld.width}px by ${rawImgOld.height} (width x height).`
        );
      }

      if (imgDiff > cfg.maxDiffThreshold) {
        messages.unshift(
          `Image diff factor (${round(
            imgDiff
          )}) is bigger than maximum threshold option ${cfg.maxDiffThreshold}.`
        );
        error = true;
      }

      if (error) {
        fs.writeFileSync(
          cfg.imgNew.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff),
          PNG.sync.write(diff)
        );
        return {
          error,
          message: messages.join("\n"),
          imgDiff,
          maxDiffThreshold: cfg.maxDiffThreshold,
        };
      } else {
        // don't overwrite file if it's the same (imgDiff < cfg.maxDiffThreshold && !isImgSizeDifferent)
        fs.unlinkSync(cfg.imgNew);
      }
    } else {
      // there is no "old screenshot" or screenshots should be immediately updated
      imgDiff = 0;
      moveFile.sync(cfg.imgNew, cfg.imgOld);
    }

    if (typeof imgDiff !== "undefined") {
      messages.unshift(
        `Image diff (${round(
          imgDiff
        )}%) is within boundaries of maximum threshold option ${
          cfg.maxDiffThreshold
        }.`
      );
      return {
        message: messages.join("\n"),
        imgDiff,
        maxDiffThreshold: cfg.maxDiffThreshold,
      };
    }

    return null;
  },
});

export const initTaskHooks = (on: Cypress.PluginEvents) => {
  on("task", {
    ...initGetScreenshotPathTask(),
    [TASK.doesFileExist]({ path }) {
      return fs.existsSync(path);
    },
    ...initApproveImageTask(),
    ...initCompareImagesTask(),
  });
};
