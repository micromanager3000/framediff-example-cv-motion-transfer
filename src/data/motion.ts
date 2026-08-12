import { validateMotionCaptureDocument, type MotionCaptureDocument } from "framediff/vision";
import extracted from "./performance.motion.json";

const errors = validateMotionCaptureDocument(extracted);
if (errors.length) throw new Error(`Invalid extracted performance motion: ${errors.join("; ")}`);

export const MOTION_DOCUMENT = extracted as unknown as MotionCaptureDocument;
