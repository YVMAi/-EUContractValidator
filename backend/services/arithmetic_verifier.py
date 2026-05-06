from backend.models.schemas import SupplementReport, ArithmeticWarning

TOLERANCE = 0.01


def verify_arithmetic(report: SupplementReport) -> list[ArithmeticWarning]:
    """
    Verify financial arithmetic in the supplement report.
    Returns list of ArithmeticWarning for any mismatches found.
    """
    warnings: list[ArithmeticWarning] = []

    fs = report.financial_summary
    line_items = report.line_items

    # Check: sum of all line item claimed_amounts equals claimed_total
    if line_items:
        computed_total = sum(item.claimed_amount for item in line_items)
        if abs(computed_total - fs.claimed_total) > TOLERANCE:
            warnings.append(
                ArithmeticWarning(
                    position="FINANCIAL_SUMMARY",
                    claimed_amount=fs.claimed_total,
                    expected_amount=round(computed_total, 2),
                    difference=round(fs.claimed_total - computed_total, 2),
                )
            )

    # Check: disputed + approvable + conditional = claimed_total
    computed_breakdown = (
        fs.disputed_amount + fs.approvable_amount + fs.conditional_amount
    )
    if abs(computed_breakdown - fs.claimed_total) > TOLERANCE:
        warnings.append(
            ArithmeticWarning(
                position="FINANCIAL_BREAKDOWN",
                claimed_amount=fs.claimed_total,
                expected_amount=round(computed_breakdown, 2),
                difference=round(fs.claimed_total - computed_breakdown, 2),
            )
        )

    # Check: net_payable = approvable_amount - retention_applicable
    expected_net = fs.approvable_amount - fs.retention_applicable
    if abs(expected_net - fs.net_payable) > TOLERANCE:
        warnings.append(
            ArithmeticWarning(
                position="NET_PAYABLE",
                claimed_amount=fs.net_payable,
                expected_amount=round(expected_net, 2),
                difference=round(fs.net_payable - expected_net, 2),
            )
        )

    return warnings
