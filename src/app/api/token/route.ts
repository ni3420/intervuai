import { StreamClient } from "@stream-io/node-sdk"
import { NextResponse } from "next/server"

const apiKey = process.env.STREAM_API_KEY
const apiSecret = process.env.STREAM_API_SECRET

export async function POST(req: Request) {
  try {
    const { userId } = await req.json()

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { msg: "keys are missing" },
        { status: 500 }
      )
    }

    const serverClient = new StreamClient(apiKey, apiSecret)

    const newUser = {
      id: userId,
      role: "admin",
      name: userId
    }

    await serverClient.upsertUsers([newUser])

    const validity = 60 * 60
    const token = serverClient.generateUserToken({
        user_id:userId,
        validity_in_seconds:validity
    })

    return NextResponse.json({ token })
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { msg: "something went wrong" },
      { status: 500 }
    )
  }
}