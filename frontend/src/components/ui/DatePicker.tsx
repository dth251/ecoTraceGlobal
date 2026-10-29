import { forwardRef } from "react";
import { Input, type InputProps } from "@/components/ui/Input";

export type DatePickerProps = Omit<InputProps, "type">;

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(props, ref) {
  return <Input ref={ref} type="date" {...props} />;
});
