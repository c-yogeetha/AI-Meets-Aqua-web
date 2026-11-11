import io
from pathlib import Path
from typing import Any, Dict
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    HRFlowable,
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def generate_timeline_chart(timeline_data: list, threshold: int = 35) -> io.BytesIO:
    """Generate a high-res timeline chart as PNG in memory."""
    times = [pt["t"] for pt in timeline_data] if timeline_data else [0]
    scores = [pt["score"] for pt in timeline_data] if timeline_data else [0]

    fig, ax = plt.subplots(figsize=(6.5, 2.0), dpi=150)
    ax.plot(times, scores, color="#0B5C73", linewidth=2.5, marker="o", markersize=4, label="Tank Score")
    ax.axhline(threshold, color="#FF4D5E", linestyle="--", linewidth=1.5, label=f"Threshold ({threshold})")
    ax.fill_between(times, scores, alpha=0.15, color="#3DD6D0")

    ax.set_ylim(-2, 102)
    ax.set_xlabel("Time (seconds)", fontsize=9)
    ax.set_ylabel("Stress Score", fontsize=9)
    ax.set_title("Tank Stress Timeline", fontsize=10, fontweight="bold", pad=6)
    ax.grid(True, linestyle=":", alpha=0.6)
    ax.legend(loc="upper right", fontsize=8)
    fig.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png")
    plt.close(fig)
    buf.seek(0)
    return buf


def generate_pdf_report(result: Dict[str, Any], output_path: str) -> None:
    """Generate professional 1-2 page PDF assessment report."""
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#062B3D"),
    )
    meta_style = ParagraphStyle(
        "MetaText",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#4A5568"),
    )
    h2_style = ParagraphStyle(
        "SectionH2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#0B5C73"),
        spaceBefore=10,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
    )

    story = []

    # Header
    story.append(Paragraph("AI Meets Aqua — Stress Assessment Report", title_style))
    tank_info = result.get("tank", {})
    tank_name = tank_info.get("name", "Tank")
    date_str = result.get("created_at", "")[:19].replace("T", " ")
    mode_str = result.get("mode", "baseline").upper()

    header_meta = f"<b>Tank:</b> {tank_name} | <b>Date:</b> {date_str} UTC | <b>Mode:</b> {mode_str} | <b>Job ID:</b> {result.get('job_id')}"
    story.append(Paragraph(header_meta, meta_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#3DD6D0"), spaceAfter=10))

    # Summary score block
    tank_score = result.get("tank_score", 0)
    level = result.get("level", "Normal")
    level_color = "#3DDC97" if level == "Normal" else ("#FFC145" if level == "Moderate" else "#FF4D5E")

    score_text = f"<b>Overall Tank Score:</b> <font color='{level_color}' size='+3'><b>{tank_score}</b></font> ({level})"
    fish_summary = f"<b>Goldfish Tracked:</b> {len(result.get('fish', []))} | <b>Stressed:</b> {result.get('stressed_count', 0)}"
    story.append(Paragraph(score_text, ParagraphStyle("ScoreText", parent=body_style, fontSize=11, leading=14)))
    story.append(Paragraph(fish_summary, meta_style))
    story.append(Spacer(1, 8))

    # Fish Table
    story.append(Paragraph("Individual Fish Assessment", h2_style))
    table_data = [["Fish ID", "Score", "Status", "Behavioral Flags", "Explanation"]]
    for f in result.get("fish", []):
        status_label = "Stressed" if f.get("stressed") else "Normal"
        flags_label = ", ".join(f.get("flags", [])) or "None"
        table_data.append([
            f.get("id"),
            str(f.get("score")),
            status_label,
            flags_label,
            Paragraph(f.get("explanation", ""), meta_style),
        ])

    fish_table = Table(table_data, colWidths=[60, 45, 60, 120, 255])
    fish_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#062B3D")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
    ]))
    story.append(fish_table)
    story.append(Spacer(1, 10))

    # Timeline Chart Image
    story.append(Paragraph("Stress Timeline", h2_style))
    chart_buf = generate_timeline_chart(result.get("timeline", []), threshold=result.get("threshold", 35))
    story.append(Image(chart_buf, width=540, height=140))
    story.append(Spacer(1, 8))

    # Suggestions Table
    suggestions = result.get("suggestions", [])
    if suggestions:
        story.append(Paragraph("Action-Based Recommendations", h2_style))
        sug_data = [["Priority", "Observed Behaviour", "Possible Cause", "Suggested Action"]]
        for s in suggestions[:4]:
            sug_data.append([
                s.get("priority", "").upper(),
                Paragraph(s.get("behaviour", ""), meta_style),
                Paragraph(s.get("cause", ""), meta_style),
                Paragraph(s.get("action", ""), meta_style),
            ])
        sug_table = Table(sug_data, colWidths=[55, 120, 140, 225])
        sug_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B5C73")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(sug_table)

    # Disclaimer
    story.append(Spacer(1, 12))
    disclaimer = result.get("disclaimer", "Behavioural indicator to support caretaker decisions; not a diagnosis.")
    story.append(Paragraph(f"<i>Disclaimer: {disclaimer}</i>", meta_style))

    doc.build(story)
