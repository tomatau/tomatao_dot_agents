export interface RenderedFile {
  distPath: string;
  content: string;
}

export interface Link {
  dest: string;
  target: string;
}

export interface HarnessAdapter {
  name: string;
  render(): Promise<RenderedFile[]>;
  links(): Promise<Link[]>;
}
