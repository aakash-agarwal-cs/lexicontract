import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const reviewId = parseInt(id, 10);
    if (isNaN(reviewId)) {
      return NextResponse.json({ error: "Invalid review ID" }, { status: 400 });
    }

    const body = await request.json();
    const { resolution_status } = body;

    if (!["ACCEPTED", "REJECTED"].includes(resolution_status)) {
      return NextResponse.json(
        { error: "resolution_status must be ACCEPTED or REJECTED" },
        { status: 400 }
      );
    }

    const updateQuery = `
      UPDATE review_queue
      SET resolution_status = $1,
          reviewed_by = $2
      WHERE review_id = $3
      RETURNING *;
    `;
    const res = await pool.query(updateQuery, [
      resolution_status,
      session.userId,
      reviewId,
    ]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Review item not found" }, { status: 404 });
    }

    return NextResponse.json({ review: res.rows[0] });
  } catch (err) {
    console.error("Error in PATCH /api/review-queue/[id]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
