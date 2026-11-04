import { NextResponse } from "next/server";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function handleCorsOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export function jsonWithCors(data, init = {}) {
  const response = NextResponse.json(data, init);
  Object.entries(corsHeaders).forEach(([key, val]) => {
    response.headers.set(key, val);
  });
  return response;
}

