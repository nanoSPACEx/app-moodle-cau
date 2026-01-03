import { jsPDF } from "jspdf";
import { COURSE_DATA } from "../constants";
import { CourseUnit } from "../types";

// Helper shared configuration
const setupDoc = () => {
  const doc = new jsPDF();
  return {
    doc,
    margin: 20,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
  };
};

// Shared Logic to render a specific unit into an existing doc
const renderUnitToDoc = (
  doc: jsPDF, 
  unit: CourseUnit, 
  startY: number, 
  margin: number, 
  pageWidth: number, 
  pageHeight: number
) => {
  let yPos = startY;
  const maxLineWidth = pageWidth - (margin * 2);

  const addNewPage = () => {
    doc.addPage();
    yPos = 20;
  };

  const checkPageBreak = (height: number) => {
    if (yPos + height > pageHeight - margin - 10) {
      addNewPage();
      return true;
    }
    return false;
  };

  // Unit Title
  checkPageBreak(30); 
  doc.setFontSize(20);
  doc.setTextColor(50, 50, 150);
  doc.text(unit.title, margin, yPos);
  yPos += 10;
  
  doc.setFontSize(12);
  doc.setTextColor(80);
  doc.text(unit.description, margin, yPos);
  yPos += 15;

  // Items
  unit.items.forEach((item: any) => {
    checkPageBreak(40);
    
    // Item Header
    doc.setFillColor(240, 240, 245);
    doc.rect(margin, yPos, maxLineWidth, 12, 'F');
    
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(item.title, margin + 2, yPos + 8);
    yPos += 18;

    // Item Description
    doc.setFontSize(10);
    doc.setTextColor(100);
    const descLines = doc.splitTextToSize(item.description, maxLineWidth);
    doc.text(descLines, margin, yPos);
    yPos += (descLines.length * 5) + 5;

    // Generated Content (from LocalStorage)
    const savedContent = localStorage.getItem(`moodle_content_${item.id}`);
    
    if (savedContent) {
      doc.setFontSize(11);
      doc.setTextColor(0);
      
      // Simple Markdown cleaning for plain PDF text
      const cleanContent = savedContent
        .replace(/#{1,6}\s?/g, '') // Remove heading hashes
        .replace(/\*\*/g, '') // Remove bold asterisks
        .replace(/\*/g, '•'); // Replace list asterisks with bullets

      const contentLines = doc.splitTextToSize(cleanContent, maxLineWidth);
      
      // Print lines checking for page breaks
      contentLines.forEach((line: string) => {
        if (checkPageBreak(7)) {
          yPos = 20;
        }
        doc.text(line, margin, yPos);
        yPos += 6;
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text("[Contingut no generat encara]", margin, yPos);
      yPos += 10;
    }
    
    yPos += 10; // Spacing between items
  });

  addNewPage(); // Start next unit on new page
  return yPos;
};

const addPageNumbers = (doc: jsPDF, pageWidth: number, pageHeight: number) => {
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `Pàgina ${i} de ${pageCount}`, 
      pageWidth / 2, 
      pageHeight - 10, 
      { align: 'center' }
    );
  }
};

export const generateCoursePDF = () => {
  const { doc, margin, pageWidth, pageHeight } = setupDoc();
  let yPos = 20;

  // Set Metadata
  doc.setProperties({
    title: "Curs Cultura Audiovisual - Complet",
    subject: "Contingut educatiu generat amb Moodle Architect",
    author: "Moodle Architect AI"
  });

  // --- Title Page ---
  doc.setFontSize(24);
  doc.setTextColor(50, 50, 150); 
  doc.text("Llibre del Curs: Cultura Audiovisual", margin, 60);
  
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text("Generat amb Moodle Architect & Gemini AI", margin, 70);
  
  doc.setFontSize(10);
  doc.text(`Data de generació: ${new Date().toLocaleDateString()}`, margin, 80);

  doc.addPage();

  // --- Table of Contents ---
  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.text("Índex de Continguts", margin, yPos);
  yPos += 15;

  doc.setFontSize(12);
  COURSE_DATA.units.forEach((unit, index) => {
    doc.text(`${index + 1}. ${unit.title}`, margin, yPos);
    yPos += 8;
  });
  
  doc.addPage();
  yPos = 20; // Reset for content

  // --- Content Processing ---
  // General Section
  renderUnitToDoc(doc, COURSE_DATA.general, yPos, margin, pageWidth, pageHeight);

  // Units
  COURSE_DATA.units.forEach(unit => {
    // Note: renderUnitToDoc handles adding new pages internally
    renderUnitToDoc(doc, unit, 20, margin, pageWidth, pageHeight);
  });

  addPageNumbers(doc, pageWidth, pageHeight);
  doc.save("curs-moodle-ebook-complet.pdf");
};

export const generateUnitPDF = (unit: CourseUnit) => {
  const { doc, margin, pageWidth, pageHeight } = setupDoc();

  // Set Metadata
  doc.setProperties({
    title: `Unitat: ${unit.title}`,
    subject: "Contingut educatiu generat amb Moodle Architect",
    author: "Moodle Architect AI"
  });

  // --- Header for Single Unit ---
  doc.setFontSize(18);
  doc.setTextColor(50, 50, 150);
  doc.text(`Document de treball: ${unit.title}`, margin, 20);
  doc.setLineWidth(0.5);
  doc.line(margin, 25, pageWidth - margin, 25);
  
  // Render content starting below header
  renderUnitToDoc(doc, unit, 35, margin, pageWidth, pageHeight);

  addPageNumbers(doc, pageWidth, pageHeight);
  
  // Clean filename
  const safeTitle = unit.title.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
  doc.save(`unitat_${safeTitle}.pdf`);
};