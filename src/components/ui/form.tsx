import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Label } from "./label";
import { cn } from "../../lib/utils";
import { FormErrors } from "./form-errors";

// Form Item wrappers
export interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(
  ({ className, ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn("space-y-1.5", className)}
        {...props}
      />
    );
  }
);
FormItem.displayName = "FormItem";

// Form Label wrapper
export interface FormLabelProps extends React.ComponentProps<typeof Label> {
  required?: boolean;
}

export const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  FormLabelProps
>(({ className, required, children, ...props }, ref) => {
  return (
    <Label
      ref={ref}
      className={cn("text-sm font-medium", className)}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-red-400">*</span>}
    </Label>
  );
});
FormLabel.displayName = "FormLabel";

// Form control wrapper
export interface FormControlProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
  error?: boolean;
}

export const FormControl = React.forwardRef<
  HTMLDivElement,
  FormControlProps
>(({ children, className, asChild = false, error, ...props }, ref) => {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      ref={ref}
      className={cn(
        "relative", 
        error && "has-error",
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});
FormControl.displayName = "FormControl";

// Form Description
export interface FormDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  FormDescriptionProps
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-xs text-white/60 mt-1", className)}
      {...props}
    />
  );
});
FormDescription.displayName = "FormDescription";

// Form Message for errors
export interface FormMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  errors?: string[] | string;
}

export const FormMessage = React.forwardRef<
  HTMLDivElement,
  FormMessageProps
>(({ className, errors, children, ...props }, ref) => {
  if (!errors && !children) {
    return null;
  }

  return (
    <FormErrors
      errors={errors || (children ? String(children) : undefined)}
      className={className}
      inline
    />
  );
});
FormMessage.displayName = "FormMessage";

// Form Section for grouping form elements
export interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

export const FormSection = React.forwardRef<
  HTMLDivElement,
  FormSectionProps
>(({ className, title, description, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("mb-6 space-y-4", className)}
      {...props}
    >
      {title && (
        <div className="border-b border-white/10 pb-2 mb-4">
          <h3 className="text-lg font-medium text-white">{title}</h3>
          {description && (
            <p className="text-sm text-white/60 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
});
FormSection.displayName = "FormSection";

// Form Group for horizontal layout
export interface FormGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const FormGroup = React.forwardRef<
  HTMLDivElement,
  FormGroupProps
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}
      {...props}
    />
  );
});
FormGroup.displayName = "FormGroup"; 