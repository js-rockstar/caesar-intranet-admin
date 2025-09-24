import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSettingSchema = z.object({
  value: z.string(),
  group: z.string().optional(),
})

// GET /api/settings/[key] - Get a specific setting
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params

    const setting = await prisma.setting.findUnique({
      where: { key }
    })

    if (!setting) {
      return NextResponse.json(
        { error: "Setting not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ setting })

  } catch (error) {
    console.error("Error fetching setting:", error)
    return NextResponse.json(
      { error: "Failed to fetch setting" },
      { status: 500 }
    )
  }
}

// PUT /api/settings/[key] - Update a specific setting
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    const body = await request.json()
    const validatedData = updateSettingSchema.parse(body)

    const setting = await prisma.setting.upsert({
      where: { key },
      update: {
        value: validatedData.value,
        ...(validatedData.group && { group: validatedData.group }),
      },
      create: {
        key,
        value: validatedData.value,
        group: validatedData.group || "general",
      },
    })

    return NextResponse.json({ 
      success: true, 
      setting 
    })

  } catch (error) {
    console.error("Error updating setting:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/[key] - Delete a specific setting
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params

    await prisma.setting.delete({
      where: { key }
    })

    return NextResponse.json({ 
      success: true, 
      message: "Setting deleted successfully" 
    })

  } catch (error) {
    console.error("Error deleting setting:", error)
    return NextResponse.json(
      { error: "Failed to delete setting" },
      { status: 500 }
    )
  }
}
