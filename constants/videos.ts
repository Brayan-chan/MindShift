export const MOTIVATIONAL_VIDEOS = [
  {
    id: 'video1',
    title: 'Morning Motivation',
    url: 'https://res.cloudinary.com/daltteifg/video/upload/v1763353914/04ca753faead0ec5ae0c14978fa35188_lhlmcp.mp4',
  },
  {
    id: 'video2',
    title: 'Discipline and Success',
    url: 'https://res.cloudinary.com/daltteifg/video/upload/v1763353913/_money__inversiones__jovenesmillonarios__emprendedores_720P_HD_vjbdjp.mp4',
  },
  {
    id: 'video3',
    title: 'Never Give Up',
    url: 'https://res.cloudinary.com/daltteifg/video/upload/v1763353909/cac67f0526440d9d4dbf8aae59e389c5_cy1csb.mp4',
  },
  {
    id: 'video4',
    title: 'Transform Your Life',
    url: 'https://res.cloudinary.com/daltteifg/video/upload/v1763353909/7589772e94706769f85e9b999ac6fb64_vse8hg.mp4',
  },
  {
    id: 'video5',
    title: 'Mental Strength',
    url: 'https://res.cloudinary.com/daltteifg/video/upload/v1763353908/d16f9b7a2ccd803c0a410cfaf6764f9e_sxtswi.mp4',
  },
  {
    id: 'video6',
    title: 'Power of Focus',
    url: 'https://res.cloudinary.com/daltteifg/video/upload/v1763353908/70811c1e66b9ae603999f258ef8d3433_ay1bf6.mp4',
  },
  {
    id: 'video7',
    title: 'Build Better Habits',
    url: 'https://res.cloudinary.com/daltteifg/video/upload/v1763353908/fb55cc96a2192f497f91826c1dead1d2_qhjayz.mp4',
  },
  {
    id: 'video8',
    title: 'The 1% Mindset',
    url: 'https://res.cloudinary.com/daltteifg/video/upload/v1763353907/889fa1289c627c0555bb371080af86ac_vp1np1.mp4',
  },
  {
    id: 'video9',
    title: 'Overcome Procrastination',
    url: 'https://res.cloudinary.com/daltteifg/video/upload/v1763353907/fc2e5f566e2be6c1c680c1810b6094a2_xavb6j.mp4',
  },
  {
    id: 'video10',
    title: 'Daily Discipline',
    url: 'https://res.cloudinary.com/daltteifg/video/upload/v1763353907/2dccfebb027999feda6df70e58afb8cf_tfol0z.mp4',
  },
];

export function getRandomVideo(excludeId?: string) {
  let availableVideos = MOTIVATIONAL_VIDEOS;
  
  // Si hay un ID a excluir, filtrarlo
  if (excludeId) {
    availableVideos = MOTIVATIONAL_VIDEOS.filter(v => v.id !== excludeId);
  }
  
  // Si ya se usaron todos, reiniciar
  if (availableVideos.length === 0) {
    availableVideos = MOTIVATIONAL_VIDEOS;
  }
  
  const randomIndex = Math.floor(Math.random() * availableVideos.length);
  return availableVideos[randomIndex];
}