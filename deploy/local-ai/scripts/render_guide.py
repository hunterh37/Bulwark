#!/usr/bin/env python3
"""Rebuild the guide PDF from Markdown; render every page for visual QA."""
from pathlib import Path
import re
import textwrap
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak,Preformatted,LongTable,TableStyle,KeepTogether
from reportlab.graphics.shapes import Drawing,Rect,String,Line,Polygon
from reportlab.graphics import renderSVG
import fitz
from PIL import Image,ImageOps,ImageDraw

ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/"docs"
NAVY=colors.HexColor("#112D42")
TEAL=colors.HexColor("#087F8C")
GRAY=colors.HexColor("#526477")
PALE=colors.HexColor("#EDF3F7")

def architecture():
    d=Drawing(480,292)
    def box(x,y,w,h,title,detail=None,fill=PALE):
        d.add(Rect(x,y,w,h,rx=5,ry=5,fillColor=fill,strokeColor=colors.HexColor("#A5B9C8")))
        d.add(String(x+w/2,y+h/2+(6 if detail else -3),title,textAnchor="middle",fontName="Helvetica-Bold",fontSize=10,fillColor=NAVY))
        if detail:d.add(String(x+w/2,y+h/2-10,detail,textAnchor="middle",fontName="Helvetica",fontSize=8,fillColor=GRAY))
    def arrow(x1,y1,x2,y2):
        d.add(Line(x1,y1,x2,y2,strokeColor=TEAL,strokeWidth=1.6))
        if x1==x2:d.add(Polygon([x2-4,y2+6,x2,y2,x2+4,y2+6],fillColor=TEAL,strokeColor=TEAL))
        else:d.add(Polygon([x2-6,y2-4,x2,y2,x2-6,y2+4],fillColor=TEAL,strokeColor=TEAL))
    box(140,244,200,42,"Bulwark on Render","HTTPS + Bearer API key")
    d.add(Rect(4,157,472,67,rx=6,ry=6,fillColor=colors.HexColor("#F5F8FA"),strokeColor=GRAY))
    d.add(String(14,209,"WINDOWS 11 HOST",fontName="Helvetica-Bold",fontSize=8,fillColor=GRAY))
    box(128,165,224,33,"Tailscale Funnel","samat.tail68d213.ts.net :443")
    arrow(240,244,240,224)
    d.add(Rect(4,5,472,132,rx=6,ry=6,fillColor=colors.white,strokeColor=GRAY))
    d.add(String(14,121,"WSL2 / UBUNTU 24.04 - LINUX FILESYSTEM",fontName="Helvetica-Bold",fontSize=8,fillColor=GRAY))
    box(14,51,133,52,"FastAPI gateway","127.0.0.1:8000")
    box(173,51,133,52,"llama.cpp router","127.0.0.1:8080")
    box(332,51,133,52,"RTX 5070 Ti","33/33 layers on CUDA0")
    d.add(Line(128,181,80,181,strokeColor=TEAL,strokeWidth=1.6))
    d.add(Line(80,181,80,103,strokeColor=TEAL,strokeWidth=1.6))
    d.add(Polygon([76,109,80,103,84,109],fillColor=TEAL,strokeColor=TEAL))
    arrow(147,77,173,77);arrow(306,77,332,77)
    d.add(String(240,25,"One instruct IQ4_XS GGUF / 4096 context / 300-second idle sleep",
                 textAnchor="middle",fontName="Helvetica",fontSize=8,fillColor=GRAY))
    d.add(String(251,145,"Existing WSL localhost forwarding",textAnchor="middle",fontName="Helvetica",fontSize=8,fillColor=GRAY))
    return d

def lifecycle():
    d=Drawing(480,275)
    rows=[
        ("Authenticate + bound request","401 / 413 / 422"),
        ("One active request; two waiting","429 when queue is full"),
        ("Check identity and free VRAM","503 when GPU is busy"),
        ("Load or reuse; generate JSON","502 / 503 / 504 on failure"),
        ("Validate paths and source lines","Detection[] or valid []"),
        ("300 seconds idle: native sleep","Next request cold-loads")]
    for i,(title,detail) in enumerate(rows):
        y=236-i*44
        d.add(Rect(8,y,286,34,rx=4,ry=4,fillColor=PALE,strokeColor=colors.HexColor("#A5B9C8")))
        d.add(String(21,y+12,str(i+1)+". "+title,fontName="Helvetica-Bold",fontSize=9,fillColor=NAVY))
        d.add(String(310,y+12,detail,fontName="Helvetica",fontSize=8,fillColor=GRAY))
        if i<5:
            d.add(Line(150,y,150,y-10,strokeColor=TEAL,strokeWidth=1.5))
            d.add(Polygon([146,y-5,150,y-10,154,y-5],fillColor=TEAL,strokeColor=TEAL))
    return d

def inline(value):
    value=escape(value)
    value=re.sub(r'\[([^]]+)\]\((https?://[^ )]+)\)',r'<link href="\2" color="#087F8C">\1</link>',value)
    value=re.sub(r'`([^`]+)`',r'<font name="Courier">\1</font>',value)
    value=re.sub(r'\*\*([^*]+)\*\*',r'<b>\1</b>',value)
    return value

def main():
    styles=getSampleStyleSheet()
    styles.add(ParagraphStyle(name="GuideBody",fontName="Helvetica",fontSize=9.4,leading=13.8,textColor=NAVY,spaceAfter=7))
    styles.add(ParagraphStyle(name="GuideH1",fontName="Helvetica-Bold",fontSize=21,leading=25,textColor=NAVY,spaceAfter=17,keepWithNext=True))
    styles.add(ParagraphStyle(name="GuideH2",fontName="Helvetica-Bold",fontSize=12,leading=16,textColor=TEAL,spaceBefore=12,spaceAfter=7,keepWithNext=True))
    styles.add(ParagraphStyle(name="GuideCode",fontName="Courier",fontSize=8,leading=10.6,backColor=PALE,borderPadding=8,spaceBefore=5,spaceAfter=12))
    styles.add(ParagraphStyle(name="GuideCell",fontName="Helvetica",fontSize=8,leading=11,textColor=NAVY,wordWrap="CJK"))
    styles.add(ParagraphStyle(name="GuideHeaderCell",parent=styles["GuideCell"],fontName="Helvetica-Bold",textColor=colors.white))
    flow=[]
    source=(DOCS/"Bulwark-Local-AI-Deployment-Guide.md").read_text()
    lines=source.splitlines()
    flow += [Spacer(1,18),Paragraph("BULWARK / ENGINEERING",styles["GuideH2"]),
             Paragraph("Local GPU Inference<br/>Deployment Guide",ParagraphStyle(name="Cover",fontName="Helvetica-Bold",fontSize=28,leading=33,textColor=NAVY,spaceAfter=19)),
             Paragraph("Windows 11 + WSL2 + NVIDIA RTX 5070 Ti Laptop GPU",styles["GuideBody"]),
             Paragraph("Foundation-Sec-8B-Instruct / IQ4_XS",styles["GuideBody"]),
             Spacer(1,10),architecture(),Spacer(1,14),
             Paragraph("Implementation and verification record - 15 November 2026",styles["GuideH2"]),
             Paragraph("Reproducible configuration, measured GPU behavior, secure API integration, and operational limits. No credentials are included.",styles["GuideBody"])]
    i=0
    while i<len(lines):
        line=lines[i]
        if not line.strip():i+=1;continue
        if line.startswith("# "):i+=1;continue
        if line.startswith("## "):
            flow.append(PageBreak());flow.append(Paragraph(inline(line[3:]),styles["GuideH1"]));i+=1;continue
        if line.startswith("### "):
            if line[4:]=="Exact model provenance":flow.append(PageBreak())
            flow.append(Paragraph(inline(line[4:]),styles["GuideH2"]));i+=1;continue
        if line.startswith("!["):
            flow.append(architecture() if "architecture" in line else lifecycle());flow.append(Spacer(1,12));i+=1;continue
        if line.startswith("```"):
            i+=1;code=[]
            while i<len(lines) and not lines[i].startswith("```"):
                for part in textwrap.wrap(lines[i],width=100,replace_whitespace=False,
                        drop_whitespace=False,subsequent_indent="  ",break_long_words=True,break_on_hyphens=False) or [""]:
                    code.append(part)
                i+=1
            flow.append(Preformatted("\n".join(code),styles["GuideCode"]));i+=1;continue
        if line.startswith("|"):
            rows=[]
            while i<len(lines) and lines[i].startswith("|"):
                cells=[c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r"[: -]+",c) for c in cells):
                    rows.append(cells)
                i+=1
            count=len(rows[0])
            widths={2:[155,325],3:[178,105,197],4:[155,90,90,145]}.get(count,[480/count]*count)
            table=LongTable([[Paragraph(inline(c),styles["GuideHeaderCell"] if n==0 else styles["GuideCell"]) for c in row] for n,row in enumerate(rows)],colWidths=widths,repeatRows=1,hAlign="LEFT")
            table.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),NAVY),("VALIGN",(0,0),(-1,-1),"TOP"),
                ("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),
                ("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7),
                ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,PALE]),
                ("LINEBELOW",(0,0),(-1,0),0.5,NAVY),("LINEBELOW",(0,1),(-1,-1),0.3,colors.HexColor("#D7E2EA"))]))
            flow.append(table);flow.append(Spacer(1,12));continue
        paragraph=[line]
        i+=1
        while i<len(lines) and lines[i].strip() and not lines[i].startswith(("#","|","```","![","- ")):
            paragraph.append(lines[i]);i+=1
        text=" ".join(paragraph)
        if text.startswith("- "):text="&#8226; "+inline(text[2:])
        else:text=inline(text)
        flow.append(Paragraph(text,styles["GuideBody"]))
    pdf=DOCS/"Bulwark-Local-AI-Deployment-Guide.pdf"
    def footer(canvas,doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#C7D6E0"));canvas.line(54,43,534,43)
        canvas.setFont("Helvetica",7.5);canvas.setFillColor(GRAY)
        canvas.drawString(54,30,"BULWARK  /  LOCAL AI DEPLOYMENT  /  15 NOV 2026")
        canvas.drawRightString(534,30,str(doc.page))
        canvas.restoreState()
    document=SimpleDocTemplate(str(pdf),pagesize=letter,leftMargin=54,rightMargin=54,
        topMargin=48,bottomMargin=58,title="Bulwark Local AI Deployment Guide",author="Bulwark Engineering")
    document.build(flow,onFirstPage=footer,onLaterPages=footer)
    renderSVG.drawToFile(architecture(),str(DOCS/"architecture.svg"))
    renderSVG.drawToFile(lifecycle(),str(DOCS/"request-lifecycle.svg"))
    qa=ROOT/"work/pdf-qa";qa.mkdir(exist_ok=True)
    opened=fitz.open(pdf)
    for n,page in enumerate(opened):
        pix=page.get_pixmap(matrix=fitz.Matrix(1.4,1.4),alpha=False)
        pix.save(qa/f"page-{n+1:02}.png")
        for block in page.get_text("blocks"):
            if block[0]<45 or block[2]>568 or block[1]<0 or block[3]>792:
                raise RuntimeError(f"Text outside safe page bounds on page {n+1}: {block[:4]}")
    for begin in range(0,len(opened),4):
        tiles=[]
        for n in range(begin,min(begin+4,len(opened))):
            img=Image.open(qa/f"page-{n+1:02}.png").convert("RGB")
            img.thumbnail((612,792))
            tile=Image.new("RGB",(636,826),"#dbe3e8");tile.paste(img,((636-img.width)//2,10))
            ImageDraw.Draw(tile).text((12,808),f"Page {n+1}",fill="black")
            tiles.append(tile)
        sheet=Image.new("RGB",(1272,1652),"#dbe3e8")
        for j,tile in enumerate(tiles):sheet.paste(tile,((j%2)*636,(j//2)*826))
        sheet.save(qa/f"contact-{begin//4+1:02}.png")
    print("PDF created and reopened:",len(opened),"pages",pdf.stat().st_size,"bytes")
if __name__=="__main__":main()
