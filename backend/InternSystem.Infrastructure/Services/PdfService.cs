using InternSystem.Core.Entities;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace InternSystem.Infrastructure.Services;

public class PdfService
{
    private readonly string _uploadRoot;

    public PdfService(string uploadRoot)
    {
        _uploadRoot = uploadRoot;
        QuestPDF.Settings.License = LicenseType.Community;
    }

    /// <summary>
    /// Generates a PIA-style Gate Pass letter PDF for a list of interns in the same department.
    /// </summary>
    public string GenerateGatePassPdf(GatePass gatePass, Intern intern, Mentor mentor, Department department)
    {
        var date = DateTime.Now.ToString("dd-MMMM-yyyy");
        var fileName = $"gatepass_{gatePass.Id}_{DateTime.Now.Ticks}.pdf";
        var pdfPath = Path.Combine(_uploadRoot, "pdfs", fileName);

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(50);

                page.Header().Element(ComposeHeader);

                page.Content().Column(col =>
                {
                    col.Spacing(10);

                    // Date (right-aligned)
                    col.Item().AlignRight().Text(date).FontSize(11);

                    col.Item().PaddingTop(10).Text("To").Bold().FontSize(11);
                    col.Item().Text("The Security Incharge").FontSize(11);
                    col.Item().Text("PIA Head Office").FontSize(11);

                    col.Item().PaddingTop(10).Text("Subject: Permission for Entry of Internship Students")
                        .Bold().FontSize(11);

                    col.Item().PaddingTop(5).Text("Dear Sir/Madam,").FontSize(11);

                    col.Item().PaddingTop(5).Text(text =>
                    {
                        text.Span("We are pleased to inform you that the following students will be undertaking their internship in the ").FontSize(11);
                        text.Span(department.Name).Bold().FontSize(11);
                        text.Span(" Section at PIA Head Office:").FontSize(11);
                    });

                    // Table of interns in this batch (for this gate pass — single intern)
                    col.Item().PaddingTop(10).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(50);
                            columns.RelativeColumn(3);
                            columns.RelativeColumn(2);
                        });

                        // Header
                        table.Header(header =>
                        {
                            header.Cell().Border(1).Padding(5).Text("S.NO").Bold().FontSize(10);
                            header.Cell().Border(1).Padding(5).Text("Student Name").Bold().FontSize(10);
                            header.Cell().Border(1).Padding(5).Text("CNIC Number").Bold().FontSize(10);
                        });

                        table.Cell().Border(1).Padding(5).Text("1").FontSize(10);
                        table.Cell().Border(1).Padding(5).Text(intern.FullName).FontSize(10);
                        table.Cell().Border(1).Padding(5).Text(intern.CNIC ?? "—").FontSize(10);
                    });

                    col.Item().PaddingTop(15).Text(text =>
                    {
                        text.Span("These students will be ").FontSize(11);
                        text.Span("undertaking an internship").Bold().Underline().FontSize(11);
                        text.Span(" under the supervision of the ").FontSize(11);
                        text.Span("Manager Information Technology").Bold().FontSize(11);
                        text.Span(" in the ").FontSize(11);
                        text.Span(department.Name).Bold().FontSize(11);
                        text.Span($" Section from ").FontSize(11);
                        text.Span(intern.StartDate.ToString("dd MMM yyyy")).Bold().FontSize(11);
                        text.Span(" to ").FontSize(11);
                        text.Span(intern.EndDate.ToString("dd MMM yyyy")).Bold().FontSize(11);
                        text.Span(".").FontSize(11);
                    });

                    col.Item().PaddingTop(10).Text("Their presence is authorized for the purpose of gaining practical experience within our organization.").FontSize(11);

                    col.Item().PaddingTop(10).Text("We kindly request you to grant them access permission and ensure that their entry and exit are recorded in accordance with the organization's security policies.").FontSize(11);

                    col.Item().PaddingTop(10).Text("Thank you for your cooperation.").FontSize(11);

                    // Signature block
                    col.Item().PaddingTop(40).Column(sig =>
                    {
                        sig.Item().Text(mentor.FullName).Bold().FontSize(11);
                        sig.Item().Text(mentor.Designation).FontSize(10);
                        sig.Item().Text(department.Name).FontSize(10);
                        sig.Item().Text("Pakistan International Airline").FontSize(10);
                    });
                });

                page.Footer().AlignRight().Text(text =>
                {
                    text.Span("Page ").FontSize(9);
                    text.CurrentPageNumber().FontSize(9);
                    text.Span(" of ").FontSize(9);
                    text.TotalPages().FontSize(9);
                });
            });
        });

        document.GeneratePdf(pdfPath);
        return Path.Combine("pdfs", fileName).Replace("\\", "/");
    }

    /// <summary>
    /// Generates a PIA-style Internship Certificate PDF.
    /// </summary>
    public string GenerateCertificatePdf(Certificate certificate, Intern intern, Mentor mentor, Department department)
    {
        var dateStr = DateTime.Now.ToString("dd MMMM, yyyy");
        var fileName = $"certificate_{certificate.Id}_{DateTime.Now.Ticks}.pdf";
        var pdfPath = Path.Combine(_uploadRoot, "pdfs", fileName);

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(60);

                page.Header().Element(ComposeHeader);

                page.Content().Column(col =>
                {
                    col.Spacing(8);

                    // Student info top-left + date top-right
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(left =>
                        {
                            left.Item().Text(intern.FullName).Bold().Italic().FontSize(12);
                            left.Item().Text($"Student of {intern.Degree ?? "Bachelor of Computer Science"}").FontSize(11);
                            left.Item().Text(intern.University ?? "University").FontSize(11);
                        });
                        row.ConstantItem(150).AlignRight().AlignBottom()
                            .Text(dateStr).FontSize(11);
                    });

                    col.Item().PaddingTop(25).AlignCenter().Text("INTERNSHIP CERTIFICATE")
                        .Bold().Italic().Underline().FontSize(14);

                    col.Item().PaddingTop(20).Text(text =>
                    {
                        text.Span("This is to certify that ").FontSize(11);
                        text.Span($"Mr./Ms. {intern.FullName}").Bold().Italic().FontSize(11);
                        text.Span($", a bright student of {intern.Degree ?? "Bachelor of Computer Science"}").FontSize(11);
                        text.Span($" from {intern.University ?? "University"}").FontSize(11);
                        text.Span(" has successfully completed a ").FontSize(11);
                        text.Span($"{Math.Round((intern.EndDate - intern.StartDate).TotalDays / 7)} Weeks").FontSize(11);
                        text.Span(" of internship program with ").FontSize(11);
                        text.Span("Pakistan International Airlines (PIA)").Bold().Italic().FontSize(11);
                        text.Span($" from {intern.StartDate.ToString("d MMMM yyyy")} to {intern.EndDate.ToString("d MMMM yyyy")}.").FontSize(11);
                    });

                    col.Item().PaddingTop(12).Text(text =>
                    {
                        text.Span("During the internship, ").FontSize(11);
                        text.Span($"Mr./Ms. {intern.FullName}").Bold().Italic().FontSize(11);
                        text.Span($" made significant contributions to the ").FontSize(11);
                        text.Span(department.Name).Bold().Italic().FontSize(11);
                        text.Span(", actively participating in the development of official projects");
                        if (!string.IsNullOrWhiteSpace(certificate.ProjectName))
                        {
                            text.Span($" ({certificate.ProjectName})").FontSize(11);
                        }
                        text.Span(" and demonstrating strong technical proficiency in ").FontSize(11);
                        if (!string.IsNullOrWhiteSpace(certificate.LanguagesUsed))
                        {
                            text.Span(certificate.LanguagesUsed).Bold().Italic().FontSize(11);
                        }
                        text.Span(". Throughout the internship, showed great enthusiasm and professionalism.").FontSize(11);
                    });

                    if (!string.IsNullOrWhiteSpace(certificate.ProjectOutcomes))
                    {
                        col.Item().PaddingTop(12).Text(text =>
                        {
                            text.Span("Key Outcomes: ").Bold().FontSize(11);
                            text.Span(certificate.ProjectOutcomes).FontSize(11);
                        });
                    }

                    col.Item().PaddingTop(12).Text("He/She demonstrated keen interest and dedication in acquiring knowledge of departmental functions, consistently showing a high level of commitment, analytical ability, and problem-solving skills. His/Her inquisitiveness and strong work ethic enabled delivery of quality outcomes and a deeper understanding of assigned tasks.").FontSize(11);

                    col.Item().PaddingTop(12).Text("We deeply appreciate the hard work, professionalism and exceptional performance, and we are confident that he/she will achieve great success in future career. We wish all the best in professional and academic pursuits.").FontSize(11);

                    // Signature block (bottom right)
                    col.Item().PaddingTop(50).AlignRight().Column(sig =>
                    {
                        sig.Item().Text("Oftg.Manager Application Development").FontSize(11);
                        sig.Item().Text(mentor.FullName).FontSize(11);
                        sig.Item().Text("Pakistan International Airlines").FontSize(11);
                    });
                });

                page.Footer().AlignRight().Text(text =>
                {
                    text.Span("Page ").FontSize(9);
                    text.CurrentPageNumber().FontSize(9);
                    text.Span(" of ").FontSize(9);
                    text.TotalPages().FontSize(9);
                });
            });
        });

        document.GeneratePdf(pdfPath);
        return Path.Combine("pdfs", fileName).Replace("\\", "/");
    }

    private static void ComposeHeader(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Column(logo =>
                {
                    logo.Item().Text("✈ PAKISTAN").Bold().FontSize(14).FontColor("#006633");
                    logo.Item().Text("International Airlines").Bold().FontSize(12).FontColor("#006633");
                    logo.Item().Text("Great People to Fly With").FontSize(8).FontColor("#8B6914");
                });
            });
            col.Item().PaddingTop(4).BorderBottom(2).BorderColor("#006633");
            col.Item().PaddingTop(2).BorderBottom(1).BorderColor("#8B6914");
            col.Item().Height(10);
        });
    }
}
