declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

// Declare DeckyPluginLoader global
declare global {
  const DeckyPluginLoader: {
    toaster: {
      toast: (options: {
        title: string;
        body?: string | React.ReactNode;
        duration?: number;
        logo?: React.ReactNode;
        critical?: boolean;
        onClick?: () => void;
      }) => void;
    };
  };
}

export {};