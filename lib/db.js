import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn("[Database] MONGODB_URI is not defined in environment variables");
}

let uri = process.env.MONGODB_URI || "";
if (uri && uri.includes(".mongodb.net") && !uri.match(/\.mongodb\.net\/[a-zA-Z0-9_-]+/)) {
  uri = uri.replace(".mongodb.net", ".mongodb.net/whatsapp_leads?retryWrites=true&w=majority");
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      console.log("Connected to MongoDB via Mongoose successfully!");
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
