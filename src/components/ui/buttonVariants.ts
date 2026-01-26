import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-g-blue text-white hover:bg-g-blue/90 shadow-[0_0_10px_rgba(66,133,244,0.3)]",
        destructive: "bg-g-red text-white hover:bg-g-red/90 shadow-[0_0_10px_rgba(234,67,53,0.3)]",
        outline: "border border-white/10 bg-white/5 hover:bg-white/10 text-white",
        secondary: "bg-g-yellow text-black hover:bg-g-yellow/80",
        ghost: "hover:bg-white/10 text-white",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
