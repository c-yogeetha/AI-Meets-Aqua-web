import html
import io
import re
import time
from pathlib import Path
from typing import Any, Dict, Optional
from zoneinfo import ZoneInfo

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Register bundled DejaVuSans TrueType fonts from matplotlib
_FONTS_REGISTERED = False


def ensure_fonts_registered() -> None:
    global _FONTS_REGISTERED
    if _FONTS_REGISTERED:
        return
    font_dir = Path(matplotlib.get_data_path()) / "fonts" / "ttf"
    regular = font_dir / "DejaVuSans.ttf"
    bold = font_dir / "DejaVuSans-Bold.ttf"
    oblique = font_dir / "DejaVuSans-Oblique.ttf"
    bold_oblique = font_dir / "DejaVuSans-BoldOblique.ttf"

    if regular.exists():
        pdfmetrics.registerFont(TTFont("DejaVuSans", str(regular)))
    if bold.exists():
        pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(bold)))
    if oblique.exists():
        pdfmetrics.registerFont(TTFont("DejaVuSans-Oblique", str(oblique)))
    if bold_oblique.exists():
        pdfmetrics.registerFont(TTFont("DejaVuSans-BoldOblique", str(bold_oblique)))

    _FONTS_REGISTERED = True


def sanitize_text(text: Any, max_len: int = 80) -> str:
    """Sanitize any arbitrary string for safe drawing in ReportLab with DejaVuSans."""
    if text is None:
        return ""
    s = str(text)

    # 1. Strip emojis and astral plane characters
    s = re.sub(r"[\U00010000-\U0010ffff]", "", s)

    # 2. Strip non-printable / control characters (except space, tab, newline)
    s = "".join(ch for ch in s if ch >= " " or ch in "\n\t")

    # 3. Replace characters unsupported by DejaVuSans with '?'
    ensure_fonts_registered()
    try:
        font = pdfmetrics.getFont("DejaVuSans")
        face = font.face
        clean_chars = []
        for ch in s:
            if ord(ch) in face.charWidths:
                clean_chars.append(ch)
            else:
                clean_chars.append("?")
        s = "".join(clean_chars)
    except Exception:
        # Fallback to ASCII / Latin-1 printable if font lookup fails
        s = "".join(ch if 32 <= ord(ch) <= 126 or 160 <= ord(ch) <= 255 else "?" for ch in s)

    # 4. Truncate if specified
    if max_len and len(s) > max_len:
        s = s[: max_len - 3] + "..."

    # 5. Escape HTML entities for ReportLab Paragraph parser
    return html.escape(s)


class NumberedCanvas(canvas.Canvas):
    """Canvas that adds standard Matsya footer metadata and page numbering."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("DejaVuSans", 8)
        self.setFillColor(colors.HexColor("#6D878C"))
        footer_text = f"Matsya Project Team | Page {self._pageNumber} of {page_count}"
        self.drawString(36, 24, footer_text)
        self.drawRightString(letter[0] - 36, 24, "Behavioural indicator to support caretaker decisions; not a diagnosis.")
        self.restoreState()


def generate_timeline_chart(timeline_data: list, threshold: int = 35) -> io.BytesIO:
    """Generate high-contrast timeline chart PNG in memory."""
    times = [pt.get("t", 0) for pt in timeline_data] if timeline_data else [0]
    scores = [pt.get("score", 0) for pt in timeline_data] if timeline_data else [0]

    fig, ax = plt.subplots(figsize=(6.8, 1.8), dpi=140)
    fig.patch.set_facecolor("#FFFFFF")
    ax.set_facecolor("#F8FAFC")

    ax.plot(times, scores, color="#12485F", linewidth=2.0, marker="o", markersize=3, label="Tank Score")
    ax.axhline(threshold, color="#E5636A", linestyle="--", linewidth=1.2, label=f"Threshold ({threshold})")
    ax.fill_between(times, scores, alpha=0.12, color="#4FD1C5")

    ax.set_ylim(-2, 102)
    ax.set_xlabel("Time (seconds)", fontsize=8, color="#071A27")
    ax.set_ylabel("Score", fontsize=8, color="#071A27")
    ax.tick_params(labelsize=7, colors="#071A27")
    ax.grid(True, linestyle=":", alpha=0.5, color="#CBD5E1")
    ax.legend(loc="upper right", fontsize=7, framealpha=0.8)
    fig.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf


def downscale_key_frame(image_path: Path, max_width: int = 640) -> Optional[io.BytesIO]:
    """Load and downscale a key frame to max 640px JPEG for PDF embedding."""
    if not image_path.exists():
        return None
    try:
        with PILImage.open(image_path) as img:
            rgb_img = img.convert("RGB")
            w, h = rgb_img.size
            if w > max_width:
                new_h = int(h * (max_width / w))
                rgb_img = rgb_img.resize((max_width, new_h), PILImage.Resampling.LANCZOS)
            buf = io.BytesIO()
            rgb_img.save(buf, format="JPEG", quality=80)
            buf.seek(0)
            return buf
    except Exception:
        return None


def generate_pdf_report(
    result: Dict[str, Any],
    output_path: str,
    key_frames_dir: Optional[Path] = None,
    timeout_s: float = 20.0,
) -> None:
    """Generate a hardened, professional 1-2 page PDF assessment report."""
    start_time = time.time()
    ensure_fonts_registered()

    # Ensure parent directory exists
    out_file = Path(output_path)
    out_file.parent.mkdir(parents=True, exist_ok=True)

    tank_info = result.get("tank", {})
    raw_tank_name = tank_info.get("name", "Tank")
    clean_tank_name = sanitize_text(raw_tank_name, max_len=80)

    doc = SimpleDocTemplate(
        str(out_file),
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=44,
        title=f"Matsya analysis report - {clean_tank_name}",
        author="Matsya Project Team",
        creator="Matsya",
    )

    styles = getSampleStyleSheet()

    # Define DejaVu typography styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="DejaVuSans-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#040D14"),
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="DejaVuSans",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#6D878C"),
    )
    h2_style = ParagraphStyle(
        "SectionH2",
        parent=styles["Normal"],
        fontName="DejaVuSans-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#12485F"),
        spaceBefore=8,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontName="DejaVuSans",
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#071A27"),
    )
    meta_style = ParagraphStyle(
        "MetaText",
        parent=styles["Normal"],
        fontName="DejaVuSans",
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#4A5568"),
    )

    story = []

    # 1. Header
    story.append(Paragraph("Matsya analysis report", title_style))

    # Format IST Date
    created_at_raw = result.get("created_at", "")
    try:
        # Parse UTC date and convert to Asia/Kolkata
        from datetime import datetime
        dt_str = created_at_raw.replace("Z", "+00:00")
        dt = datetime.fromisoformat(dt_str)
        ist_dt = dt.astimezone(ZoneInfo("Asia/Kolkata"))
        ist_str = ist_dt.strftime("%d %b %Y, %H:%M IST")
    except Exception:
        ist_str = sanitize_text(created_at_raw[:19].replace("T", " ")) + " UTC"

    mode_str = sanitize_text(result.get("mode", "baseline").upper())
    job_id = sanitize_text(result.get("job_id", "")[:8])

    reliability_data = result.get("reliability", {})
    rel_level = sanitize_text(str(reliability_data.get("level", "high")).upper())
    rel_score = reliability_data.get("score", 100)
    rel_reasons = reliability_data.get("reasons", [])

    meta_line = (
        f"<b>Tank:</b> {clean_tank_name} &nbsp;|&nbsp; "
        f"<b>Date:</b> {ist_str} &nbsp;|&nbsp; "
        f"<b>Analyzer:</b> {mode_str} &nbsp;|&nbsp; "
        f"<b>Reliability:</b> {rel_level} ({rel_score}/100) &nbsp;|&nbsp; "
        f"<b>Job:</b> {job_id}"
    )
    story.append(Paragraph(meta_line, subtitle_style))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#1E7F8C"), spaceAfter=8))

    # Reliability Warning Box if Medium or Low
    if rel_level in ("MEDIUM", "LOW") and rel_reasons:
        warning_bg = colors.HexColor("#FFFBEB") if rel_level == "MEDIUM" else colors.HexColor("#FEF2F2")
        warning_border = colors.HexColor("#F59E0B") if rel_level == "MEDIUM" else colors.HexColor("#EF4444")
        reasons_text = " • " + " • ".join(sanitize_text(r) for r in rel_reasons)
        warn_p = Paragraph(
            f"<b>Reliability Advisory ({rel_level}):</b> {reasons_text}",
            ParagraphStyle("WarnBox", parent=meta_style, textColor=colors.HexColor("#991B1B" if rel_level == "LOW" else "#92400E")),
        )
        warn_table = Table([[warn_p]], colWidths=[540])
        warn_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), warning_bg),
            ("BOX", (0, 0), (-1, -1), 1, warning_border),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(warn_table)
        story.append(Spacer(1, 6))

    # 2. Overall Score & Summary
    tank_score = result.get("tank_score", 0)
    level = sanitize_text(result.get("level", "Normal"))
    level_color = "#3FBF8F" if level == "Normal" else ("#E9B949" if level == "Moderate" else "#E5636A")
    fish_list = result.get("fish", [])

    score_line = f"<b>Overall Tank Score:</b> <font color='{level_color}' size='+2'><b>{tank_score}</b></font> ({level})"
    fish_summary = (
        f"<b>Goldfish Tracked:</b> {len(fish_list)} &nbsp;|&nbsp; "
        f"<b>Stressed Fish:</b> {result.get('stressed_count', 0)} &nbsp;|&nbsp; "
        f"<b>Duration:</b> {result.get('video', {}).get('duration_s', 0):.1f}s"
    )
    story.append(Paragraph(score_line, ParagraphStyle("ScoreLine", parent=body_style, fontSize=11, leading=14)))
    story.append(Paragraph(fish_summary, meta_style))
    story.append(Spacer(1, 6))

    # 3. Individual Fish Table
    story.append(Paragraph("Individual Fish Assessment", h2_style))
    if not fish_list:
        no_fish_msg = "No goldfish were detected or tracked in this video clip."
        story.append(Paragraph(f"<i>{no_fish_msg}</i>", meta_style))
        story.append(Spacer(1, 6))
    else:
        table_data = [["Fish ID", "Score", "Status", "Behavioral Flags", "Explanation"]]
        for f in fish_list:
            fid = sanitize_text(f.get("id"))
            fscore = str(f.get("score", 0))
            is_low_conf = f.get("confidence", 1.0) < 0.4
            if is_low_conf:
                status_label = "Not enough data"
            elif f.get("stressed"):
                status_label = "Stressed"
            else:
                status_label = "Normal"
            flags_label = sanitize_text(", ".join(f.get("flags", [])) or "None", max_len=60)
            expl = sanitize_text(f.get("explanation", ""), max_len=140)

            table_data.append([
                fid,
                fscore,
                status_label,
                flags_label,
                Paragraph(expl, meta_style),
            ])

        fish_table = Table(table_data, colWidths=[65, 45, 75, 130, 225])
        fish_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0A2A3D")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "DejaVuSans-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("FONTNAME", (0, 1), (-1, -1), "DejaVuSans"),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(fish_table)
        story.append(Spacer(1, 8))

    # 4. Stress Timeline Chart
    story.append(Paragraph("Stress Timeline", h2_style))
    chart_buf = generate_timeline_chart(result.get("timeline", []), threshold=result.get("threshold", 35))
    story.append(Image(chart_buf, width=540, height=130))
    story.append(Spacer(1, 6))

    # 5. Key Moments Gallery (Up to 4 images, downscaled)
    key_moments = result.get("key_moments", [])
    embedded_images = []
    if key_frames_dir and key_frames_dir.exists():
        for km in key_moments[:4]:
            frame_url = km.get("frame_url", "")
            fname = frame_url.split("/")[-1] if frame_url else ""
            if fname:
                img_path = key_frames_dir / fname
                buf = downscale_key_frame(img_path, max_width=640)
                if buf:
                    label_str = sanitize_text(f"{km.get('behaviour', 'Moment')} ({km.get('t', 0):.1f}s)")
                    img_flowable = Image(buf, width=125, height=70)
                    caption = Paragraph(label_str, ParagraphStyle("Cap", parent=meta_style, fontSize=7, leading=9, alignment=1))
                    embedded_images.append([img_flowable, caption])

    if embedded_images:
        story.append(Paragraph("Key Moments Captured", h2_style))
        # Arrange horizontally up to 4 columns
        col_count = len(embedded_images)
        col_w = int(540 / col_count)
        km_table_data = [[item[0] for item in embedded_images], [item[1] for item in embedded_images]]
        km_table = Table(km_table_data, colWidths=[col_w] * col_count)
        km_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        story.append(km_table)
        story.append(Spacer(1, 6))

    # 6. Suggestions Table
    suggestions = result.get("suggestions", [])
    if suggestions:
        story.append(Paragraph("Action-Oriented Suggestions", h2_style))
        sug_data = [["Priority", "Observed Behaviour", "Possible Cause", "Suggested Action"]]
        for s in suggestions[:4]:
            prio = sanitize_text(s.get("priority", "").upper())
            beh = sanitize_text(s.get("behaviour", ""))
            cau = sanitize_text(s.get("cause", ""))
            act = sanitize_text(s.get("action", ""))
            sug_data.append([
                prio,
                Paragraph(beh, meta_style),
                Paragraph(cau, meta_style),
                Paragraph(act, meta_style),
            ])
        sug_table = Table(sug_data, colWidths=[55, 125, 140, 220])
        sug_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#12485F")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "DejaVuSans-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("FONTNAME", (0, 1), (-1, -1), "DejaVuSans"),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(KeepTogether(sug_table))

    # 7. Method note & Disclaimer
    story.append(Spacer(1, 8))
    method_note = (
        "<b>Method note:</b> Analysis performed via Matsya behavioural pipeline evaluating kinematic signals "
        "(swimming speed, direction change rate, nearest-neighbour isolation, and vertical tank positioning). "
        "Thresholds configured for demonstration and research reference."
    )
    story.append(Paragraph(method_note, meta_style))
    story.append(Spacer(1, 4))
    disclaimer = result.get("disclaimer", "Behavioural indicator to support caretaker decisions; not a diagnosis.")
    story.append(Paragraph(f"<i>Disclaimer: {sanitize_text(disclaimer)}</i>", meta_style))

    # Check timeout
    elapsed = time.time() - start_time
    if elapsed > timeout_s:
        raise TimeoutError(f"PDF generation exceeded timeout of {timeout_s}s (elapsed: {elapsed:.2f}s)")

    # Build PDF with NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
