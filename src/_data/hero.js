const sequence = [
  ["wave", "wave_right"],
  ["salute", "salute_left"],
  ["cheer", "cheer"],
  ["dab", "dab_left"],
  ["wave", "wave_left"],
  ["point", "heart_point"],
  ["siuuu", "siuuu"],
];

export default sequence.map(([label, clip]) => ({
  label,
  webm: `static/videos/${clip}_blender.webm`,
  mov: `static/videos/${clip}_blender.mov`,
}));
