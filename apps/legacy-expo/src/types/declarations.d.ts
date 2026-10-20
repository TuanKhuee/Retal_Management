declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.css';
declare module '@/global.css';

declare module '*.png' {
  const content: any;
  export default content;
}

declare module '*.jpg' {
  const content: any;
  export default content;
}

declare module '*.svg' {
  const content: any;
  export default content;
}
