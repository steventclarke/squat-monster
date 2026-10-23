export const PLATE_DIAMETERS_MM = [450, 500, 550, 600] as const;
export const DEFAULT_PLATE_DIAMETER_MM = 450;
export const MAX_VIDEO_DURATION_SEC = 60;
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];
export const ACCEPTED_VIDEO_EXT = [".mp4", ".mov"];
export const LOAD_UNITS = ["kg", "lb"] as const;
export const GRAVITY_M_S2 = 9.80665;

export type LoadUnit = (typeof LOAD_UNITS)[number];

export interface SetInputs {
  plateDiameterMm: number;
  loadValue: string;
  loadUnit: LoadUnit;
}
