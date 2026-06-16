import { ComponentProps } from "react"
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left"
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-6",
        month: "flex flex-col gap-4",
        caption: "flex justify-center pt-2 relative items-center w-full mb-4",
        caption_label: "text-base font-bold",
        nav: "flex items-center gap-2",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "size-8 bg-transparent p-0 hover:bg-accent hover:text-accent-foreground"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_start: "flex justify-center pt-1 relative items-center",
        caption_end: "flex justify-center pt-1 relative items-center",
        table: "w-full border-collapse border-spacing-0",
        head_row: "flex w-full gap-1 mb-2",
        head_cell:
          "text-muted-foreground rounded-md w-10 h-10 font-semibold text-sm flex items-center justify-center shrink-0",
        row: "flex w-full gap-1 mt-1",
        week: "flex w-full gap-1 mt-1",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 w-10 h-10 shrink-0 flex items-center justify-center",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "w-10 h-10 p-0 font-normal text-sm aria-selected:opacity-100 hover:bg-accent/50"
        ),
        day_range_start:
          "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_range_end:
          "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent/30 text-accent-foreground font-bold border-2 border-accent",
        day_outside:
          "day-outside text-muted-foreground/40 opacity-50 aria-selected:text-muted-foreground/40",
        day_disabled: "text-muted-foreground/30 opacity-30",
        day_range_middle:
          "aria-selected:bg-accent/30 aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        weeknumber: "text-muted-foreground rounded-md w-10 h-10 font-semibold text-sm flex items-center justify-center shrink-0 bg-muted/30",
        ...classNames,
      }}
      components={{
        PreviousMonthButton: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        NextMonthButton: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  )
}

export { Calendar }
