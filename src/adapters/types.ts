import type { Link } from "../lib/links";

export interface RenderedFile {
  distPath: string;
  content: string;
}

export interface HarnessAdapter {
  name: string;
  render(): Promise<RenderedFile[]>;
  links(): Promise<Link[]>;
}
