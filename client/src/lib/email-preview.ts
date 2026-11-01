export type PreviewDevice = "mobile" | "tablet" | "desktop";

export function previewDeviceClass(device: PreviewDevice) {
  if (device === "mobile") return "max-w-[320px]";
  if (device === "tablet") return "max-w-[560px]";
  return "max-w-[760px]";
}
