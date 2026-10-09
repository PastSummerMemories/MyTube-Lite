import type { RequestHandler, Response } from "express";

/**
 * 统一 API 响应格式：
 * { code: number, message: string, data: any }
 */
function wrapJson(res: Response, body: unknown) {
  const code = res.statusCode || 200;

  if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    Object.prototype.hasOwnProperty.call(body, "code") &&
    Object.prototype.hasOwnProperty.call(body, "data")
  ) {
    return body;
  }

  if (code >= 400) {
    const message =
      (body &&
        typeof body === "object" &&
        "message" in body &&
        (body as { message?: unknown }).message) ||
      "请求失败";
    return { code, message, data: null };
  }

  if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    Object.keys(body).length === 1 &&
    Object.prototype.hasOwnProperty.call(body, "message")
  ) {
    return {
      code,
      message: (body as { message: string }).message,
      data: null,
    };
  }

  if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    Object.prototype.hasOwnProperty.call(body, "message")
  ) {
    const { message, ...rest } = body as { message: string } & Record<
      string,
      unknown
    >;
    return {
      code,
      message,
      data: Object.keys(rest).length ? rest : null,
    };
  }

  return {
    code,
    message: "ok",
    data: body === undefined ? null : body,
  };
}

const responseFormatter: RequestHandler = (_req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) =>
    originalJson(wrapJson(res, body))) as typeof res.json;

  next();
};

export { responseFormatter, wrapJson };
