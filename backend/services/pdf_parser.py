import fitz


def extract_text(data: bytes) -> tuple[str, int]:
    """Extract all text from PDF bytes. Returns (text, page_count)."""
    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as e:
        raise ValueError(f"Failed to open PDF: {e}")

    if doc.page_count == 0:
        raise ValueError("PDF has no pages")

    pages = []
    for page in doc:
        pages.append(page.get_text())

    doc.close()
    text = "\n".join(pages)

    if not text.strip():
        raise ValueError("PDF appears to contain no extractable text (may be scanned image-only PDF)")

    return text, doc.page_count if not doc.is_closed else len(pages)


def extract_text_from_path(path: str) -> tuple[str, int]:
    """Extract text from a PDF file path."""
    try:
        doc = fitz.open(path)
    except Exception as e:
        raise ValueError(f"Failed to open PDF at {path}: {e}")

    pages = []
    for page in doc:
        pages.append(page.get_text())

    page_count = doc.page_count
    doc.close()

    text = "\n".join(pages)
    if not text.strip():
        raise ValueError("PDF appears to contain no extractable text")

    return text, page_count
