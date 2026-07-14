import { z } from "zod";

export const profileMediaCropSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
    positionX: z.number().min(0).max(1),
    positionY: z.number().min(0).max(1),
    scale: z.number().min(1).max(3),
    sourceWidth: z.number().int().positive().max(10000),
    sourceHeight: z.number().int().positive().max(10000),
  })
  .refine((crop) => crop.x + crop.width <= 1, {
    message: "The profile crop extends beyond the image width.",
  })
  .refine((crop) => crop.y + crop.height <= 1, {
    message: "The profile crop extends beyond the image height.",
  });

export type ProfileMediaCrop = z.infer<typeof profileMediaCropSchema>;

export function parseProfileMediaCrop(value: unknown): ProfileMediaCrop | null {
  const parsed = profileMediaCropSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
