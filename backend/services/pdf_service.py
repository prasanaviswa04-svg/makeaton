import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from backend.models import Invoice

class PDFService:
    @staticmethod
    def generate_invoice_pdf(invoice: Invoice) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        
        styles = getSampleStyleSheet()
        normal = styles["Normal"]
        
        primary_color = colors.HexColor("#714B67")  # Odoo purple
        secondary_color = colors.HexColor("#017E84")  # Odoo teal
        dark_text = colors.HexColor("#1e293b")
        muted_text = colors.HexColor("#64748b")
        
        title_style = ParagraphStyle(
            "DocTitle",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=22,
            textColor=primary_color,
            leading=26
        )
        
        h2_style = ParagraphStyle(
            "H2",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=13,
            textColor=dark_text,
            leading=16
        )
        
        body_style = ParagraphStyle(
            "Body",
            parent=normal,
            fontName="Helvetica",
            fontSize=9,
            textColor=dark_text,
            leading=12
        )
        
        muted_style = ParagraphStyle(
            "Muted",
            parent=normal,
            fontName="Helvetica",
            fontSize=8,
            textColor=muted_text,
            leading=11
        )
        
        story = []

        # Header Table: Company Info vs Invoice Title & Status
        status_color = "#16a34a" if invoice.status == "paid" else ("#dc2626" if invoice.amount_due > 0 and invoice.due_date < invoice.issue_date else "#2563eb")
        
        header_data = [
            [
                Paragraph("<b>Brightloop Software</b><br/>Subscription Management System<br/><font color='#64748b'>support@brightloop.com | www.brightloop.com</font>", body_style),
                Paragraph(f"<font color='{primary_color}'><b>INVOICE</b></font><br/><b>#{invoice.invoice_number}</b><br/><font color='{status_color}'><b>STATUS: {invoice.status.upper()}</b></font>", ParagraphStyle("RightHeader", parent=normal, fontName="Helvetica", fontSize=11, alignment=2, leading=15))
            ]
        ]
        header_table = Table(header_data, colWidths=[3.5*inch, 3.5*inch])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ]))
        story.append(header_table)
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceBefore=5, spaceAfter=15))

        # Bill To & Invoice Meta
        cust = invoice.customer
        cust_name = cust.full_name if cust else "Valued Customer"
        cust_company = f"<br/>{cust.company_name}" if cust and cust.company_name else ""
        cust_email = f"<br/>{cust.email}" if cust else ""
        cust_phone = f"<br/>{cust.phone}" if cust and cust.phone else ""

        meta_data = [
            [
                Paragraph(f"<b>Billed To:</b><br/><b>{cust_name}</b>{cust_company}{cust_email}{cust_phone}", body_style),
                Paragraph(f"<b>Issue Date:</b> {invoice.issue_date}<br/>"
                          f"<b>Due Date:</b> {invoice.due_date}<br/>"
                          f"<b>Billing Period:</b> {invoice.billing_period_start} to {invoice.billing_period_end}<br/>"
                          f"<b>Subscription:</b> {invoice.subscription.sub_number if invoice.subscription else 'N/A'}", body_style)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[3.5*inch, 3.5*inch])
        meta_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 15),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 10))

        # Line Items Table
        items_data = [
            [
                Paragraph("<b>Item Description</b>", ParagraphStyle("TH1", parent=body_style, fontName="Helvetica-Bold", textColor=colors.white)),
                Paragraph("<b>Qty</b>", ParagraphStyle("TH2", parent=body_style, fontName="Helvetica-Bold", textColor=colors.white, alignment=1)),
                Paragraph("<b>Unit Price</b>", ParagraphStyle("TH3", parent=body_style, fontName="Helvetica-Bold", textColor=colors.white, alignment=2)),
                Paragraph("<b>Tax Rate</b>", ParagraphStyle("TH4", parent=body_style, fontName="Helvetica-Bold", textColor=colors.white, alignment=2)),
                Paragraph("<b>Amount</b>", ParagraphStyle("TH5", parent=body_style, fontName="Helvetica-Bold", textColor=colors.white, alignment=2))
            ]
        ]

        for line in invoice.lines:
            items_data.append([
                Paragraph(f"{line.description}", body_style),
                Paragraph(f"{line.quantity}", ParagraphStyle("C", parent=body_style, alignment=1)),
                Paragraph(f"Rs. {line.unit_price:,.2f}", ParagraphStyle("R1", parent=body_style, alignment=2)),
                Paragraph(f"{line.tax_rate}%", ParagraphStyle("R2", parent=body_style, alignment=2)),
                Paragraph(f"Rs. {line.total_amount:,.2f}", ParagraphStyle("R3", parent=body_style, alignment=2))
            ])

        items_table = Table(items_data, colWidths=[3.2*inch, 0.7*inch, 1.1*inch, 0.9*inch, 1.1*inch])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), primary_color),
            ('ALIGN', (1, 1), (1, -1), 'CENTER'),
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ]))
        story.append(items_table)
        story.append(Spacer(1, 15))

        # Totals Summary Table
        totals_data = [
            [Paragraph("Subtotal:", ParagraphStyle("R", parent=body_style, alignment=2)), Paragraph(f"Rs. {invoice.subtotal:,.2f}", ParagraphStyle("R", parent=body_style, alignment=2))],
            [Paragraph("Tax Total:", ParagraphStyle("R", parent=body_style, alignment=2)), Paragraph(f"+Rs. {invoice.tax_amount:,.2f}", ParagraphStyle("R", parent=body_style, alignment=2))],
        ]
        if invoice.discount_amount > 0:
            totals_data.append([Paragraph("Discount:", ParagraphStyle("R", parent=body_style, alignment=2, textColor=colors.HexColor("#16a34a"))), Paragraph(f"-Rs. {invoice.discount_amount:,.2f}", ParagraphStyle("R", parent=body_style, alignment=2, textColor=colors.HexColor("#16a34a")))])
        
        totals_data.append([Paragraph("<b>Total Amount:</b>", ParagraphStyle("R", parent=body_style, fontName="Helvetica-Bold", alignment=2)), Paragraph(f"<b>Rs. {invoice.total_amount:,.2f}</b>", ParagraphStyle("R", parent=body_style, fontName="Helvetica-Bold", alignment=2))])
        totals_data.append([Paragraph("Amount Paid:", ParagraphStyle("R", parent=body_style, alignment=2)), Paragraph(f"Rs. {invoice.amount_paid:,.2f}", ParagraphStyle("R", parent=body_style, alignment=2))])
        totals_data.append([Paragraph("<b>Balance Due:</b>", ParagraphStyle("R", parent=body_style, fontName="Helvetica-Bold", alignment=2, textColor=primary_color)), Paragraph(f"<b>Rs. {invoice.amount_due:,.2f}</b>", ParagraphStyle("R", parent=body_style, fontName="Helvetica-Bold", alignment=2, textColor=primary_color))])

        totals_table = Table(totals_data, colWidths=[5.5*inch, 1.5*inch])
        totals_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('LINEABOVE', (0,-1), (-1,-1), 1, primary_color),
        ]))
        story.append(totals_table)
        story.append(Spacer(1, 20))

        # Footer notes
        story.append(Paragraph("<b>Payment Terms & Notes:</b>", body_style))
        story.append(Paragraph("Thank you for choosing Brightloop Software! For electronic bank transfers, please use your invoice number as reference. Contact support@brightloop.com for questions.", muted_style))

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
