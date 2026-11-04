"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function TableContainer({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "relative w-full min-w-0 overflow-hidden flex flex-col rounded-md border border-gray-200/90 bg-white shadow-xs transition-all",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function TableScrollArea({ children, className, maxHeight, ...props }) {
  return (
    <div
      className={cn(
        "w-full min-w-0 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200",
        className
      )}
      style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

export function Table({ className, ...props }) {
  return (
    <table
      className={cn("w-full caption-bottom text-left border-collapse text-sm bg-white", className)}
      {...props}
    />
  );
}

export function TableHeader({ className, sticky, ...props }) {
  return (
    <thead
      className={cn(
        "bg-[#fafbfd] border-b border-gray-200/90 text-[11px] font-bold tracking-wider text-gray-500 uppercase select-none",
        sticky && "sticky top-0 z-10 shadow-2xs backdrop-blur-md",
        className
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }) {
  return (
    <tbody
      className={cn("divide-y divide-gray-100 bg-white font-normal", className)}
      {...props}
    />
  );
}

export function TableFooter({ className, ...props }) {
  return (
    <tfoot
      className={cn(
        "border-t border-gray-200 bg-gray-50/50 font-medium text-gray-700",
        className
      )}
      {...props}
    />
  );
}

export function TableRow({ className, isSelected, isHoverable = true, ...props }) {
  return (
    <tr
      className={cn(
        "group/tr bg-white transition-colors duration-100",
        isHoverable && "hover:bg-gray-50/70",
        isSelected && "bg-[#DE5437]/[0.04] hover:bg-[#DE5437]/[0.07] shadow-[inset_3px_0_0_0_#DE5437]",
        className
      )}
      {...props}
    />
  );
}

export function TableHead({ className, align = "left", sticky, stickyOffset = 0, ...props }) {
  return (
    <th
      className={cn(
        "px-5 py-3.5 text-[11px] font-bold text-gray-500 tracking-wider whitespace-nowrap uppercase bg-[#fafbfd]",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        sticky === "left" &&
          "sticky left-0 z-20 bg-[#fafbfd] shadow-[1px_0_0_0_rgba(0,0,0,0.06)]",
        sticky === "right" &&
          "sticky right-0 z-20 bg-[#fafbfd] shadow-[-1px_0_0_0_rgba(0,0,0,0.06)]",
        className
      )}
      style={sticky ? { [sticky]: stickyOffset } : undefined}
      {...props}
    />
  );
}

export function TableCell({ className, align = "left", sticky, stickyOffset = 0, ...props }) {
  return (
    <td
      className={cn(
        "px-5 py-3.5 text-xs sm:text-sm text-gray-800 transition-colors whitespace-nowrap bg-white",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        sticky === "left" &&
          "sticky left-0 z-10 bg-white group-hover/tr:bg-gray-50/70 shadow-[1px_0_0_0_rgba(0,0,0,0.06)]",
        sticky === "right" &&
          "sticky right-0 z-10 bg-white group-hover/tr:bg-gray-50/70 shadow-[-1px_0_0_0_rgba(0,0,0,0.06)]",
        className
      )}
      style={sticky ? { [sticky]: stickyOffset } : undefined}
      {...props}
    />
  );
}
