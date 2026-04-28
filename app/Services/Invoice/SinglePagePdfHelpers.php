<?php

namespace App\Services\Invoice;

/**
 * Helper PDF a singola pagina (drawText, drawLine, drawFilledRect, fitText, normalize).
 *
 * Estratto da InvoicePdfService per ridurre il file principale a < 400 LOC e
 * isolare la logica grafica pura. A differenza di Brt/PdfRenderingPrimitives
 * (multi-pagina + barcode), qui basta `pageHeight` come stato condiviso
 * (singola pagina A4 fattura).
 *
 * Stato condiviso atteso:
 *   - float  $pageHeight
 *
 * @internal Trait usato solo da InvoicePdfService.
 */
trait SinglePagePdfHelpers
{
    private function buildPdfDocument(string $contentStream): string
    {
        $objects = [
            1 => '<< /Type /Catalog /Pages 2 0 R >>',
            2 => '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            3 => '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '.$this->format($this->pageWidth).' '.$this->format($this->pageHeight).'] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
            4 => '<< /Length '.strlen($contentStream)." >>\nstream\n".$contentStream."\nendstream",
            5 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            6 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [0];

        foreach ($objects as $id => $objectContent) {
            $offsets[$id] = strlen($pdf);
            $pdf .= $id." 0 obj\n".$objectContent."\nendobj\n";
        }

        $xrefOffset = strlen($pdf);
        $pdf .= "xref\n";
        $pdf .= '0 '.(count($objects) + 1)."\n";
        $pdf .= "0000000000 65535 f \n";

        for ($i = 1; $i <= count($objects); $i++) {
            $pdf .= sprintf('%010d 00000 n ', $offsets[$i] ?? 0)."\n";
        }

        $pdf .= "trailer\n";
        $pdf .= '<< /Size '.(count($objects) + 1).' /Root 1 0 R >>'."\n";
        $pdf .= "startxref\n";
        $pdf .= $xrefOffset."\n";
        $pdf .= '%%EOF';

        return $pdf;
    }

    private function drawText(
        float $x,
        float $top,
        float $fontSize,
        string $text,
        string $font = 'F1',
        string $align = 'left',
        ?float $maxWidth = null
    ): string {
        $text = $this->normalizeText($text);
        if ($maxWidth !== null) {
            $text = $this->fitTextToWidth($text, $fontSize, $maxWidth);
        }

        $textWidth = $this->estimateTextWidth($text, $fontSize);
        if ($align === 'center') {
            $x -= ($textWidth / 2);
        } elseif ($align === 'right') {
            $x -= $textWidth;
        }

        return 'BT /'.$font.' '.$this->format($fontSize).' Tf 1 0 0 1 '
            .$this->format($x).' '.$this->format($this->toPdfY($top))
            .' Tm ('.$this->escapePdfText($text).") Tj ET\n";
    }

    private function drawLine(float $x1, float $top1, float $x2, float $top2, float $lineWidth = 0.7): string
    {
        return $this->format($lineWidth).' w '
            .$this->format($x1).' '.$this->format($this->toPdfY($top1)).' m '
            .$this->format($x2).' '.$this->format($this->toPdfY($top2))." l S\n";
    }

    private function drawFilledRect(float $x, float $top, float $width, float $height, float $gray = 0.95): string
    {
        $gray = max(0.0, min(1.0, $gray));
        $bottomY = $this->toPdfY($top + $height);

        return "q\n"
            .$this->format($gray)." g\n"
            .$this->format($x).' '.$this->format($bottomY).' '
            .$this->format($width).' '.$this->format($height)." re f\n"
            ."Q\n";
    }

    private function toPdfY(float $top): float
    {
        return $this->pageHeight - $top;
    }

    private function fitTextToWidth(string $text, float $fontSize, float $maxWidth): string
    {
        if ($this->estimateTextWidth($text, $fontSize) <= $maxWidth) {
            return $text;
        }

        $suffix = '...';
        $fitted = $text;
        while ($fitted !== '' && $this->estimateTextWidth($fitted.$suffix, $fontSize) > $maxWidth) {
            $fitted = substr($fitted, 0, -1);
        }

        return rtrim($fitted).$suffix;
    }

    private function estimateTextWidth(string $text, float $fontSize): float
    {
        return strlen($text) * $fontSize * 0.52;
    }

    private function normalizeText(string $text): string
    {
        $normalized = trim(preg_replace('/\s+/', ' ', $text) ?? '');

        if ($normalized !== '' && function_exists('iconv')) {
            $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalized);
            if ($converted !== false) {
                $normalized = $converted;
            }
        }

        return preg_replace('/[^\x20-\x7E]/', ' ', $normalized) ?? '';
    }

    private function escapePdfText(string $text): string
    {
        return str_replace(
            ['\\', '(', ')'],
            ['\\\\', '\(', '\)'],
            $text
        );
    }

    private function format(float $value): string
    {
        return number_format($value, 2, '.', '');
    }
}
