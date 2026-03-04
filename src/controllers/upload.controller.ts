import { Request, Response } from "express";
import { createPresignedPost, getSignedUrl } from "../middlewares/s3new";
import { logger } from "../config/logger";

export const uploadUrl = async (req: Request, res: Response): Promise<Response | void | any > => {
    try {
      const { content_type } = req.body;
      let { key } = req.body;
      key = "public/" + key;
      const data = await createPresignedPost({ key, contentType: content_type });
      return res.send({
        status: "success",
        data,
      });
    } catch (err) {
      logger.error(err);
      return res.status(500).send({
        status: "error",
        //@ts-expect-error: err is unknown
        message: err?.message as string,
      });
    }
  }

export const getUrl = async (req: Request, res: Response): Promise<Response | void | any> => {
  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).send({
        status: "error",
        message: "Key is required",
      });
    }
    const url = await getSignedUrl(key);
    return res.send({
      status: "success",
      data: { url },
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).send({
      status: "error",
      //@ts-expect-error: err is unknown
      message: err?.message as string,
    });
  }
};
