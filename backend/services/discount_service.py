from datetime import date
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from backend.models import DiscountRule, Subscription, SubscriptionLine, Product

class DiscountService:
    @staticmethod
    def is_discount_valid(discount: DiscountRule, check_date: Optional[date] = None) -> Tuple[bool, str]:
        if not discount.is_active:
            return False, "Discount rule is inactive."
        
        target_date = check_date or date.today()
        
        if discount.start_date and target_date < discount.start_date:
            return False, f"Discount not active until {discount.start_date}."
        
        if discount.end_date and target_date > discount.end_date:
            return False, f"Discount expired on {discount.end_date}."
        
        if discount.usage_limit is not None and discount.used_count >= discount.usage_limit:
            return False, f"Discount usage limit reached ({discount.used_count}/{discount.usage_limit})."
        
        return True, "Valid"

    @staticmethod
    def calculate_discount_for_subscription(
        discount: DiscountRule,
        subtotal: float,
        total_quantity: int,
        lines_data: list,
        check_date: Optional[date] = None
    ) -> float:
        """
        Calculates total discount amount applicable to a subscription or its line items.
        Returns the discount amount in currency units.
        """
        is_valid, _ = DiscountService.is_discount_valid(discount, check_date)
        if not is_valid:
            return 0.0

        # Check minimum conditions
        if discount.min_purchase_amount > 0 and subtotal < discount.min_purchase_amount:
            return 0.0
        
        if discount.min_quantity > 0 and total_quantity < discount.min_quantity:
            return 0.0

        discount_amount = 0.0

        if discount.target_type == "whole_subscription":
            if discount.discount_type == "percentage":
                discount_amount = (subtotal * discount.value) / 100.0
            else:  # fixed
                discount_amount = min(discount.value, subtotal)
        
        elif discount.target_type == "specific_products" and discount.product_id:
            # Apply only to matching product lines
            applicable_subtotal = 0.0
            applicable_qty = 0
            for line in lines_data:
                prod_id = getattr(line, "product_id", None) or line.get("product_id")
                qty = getattr(line, "quantity", 0) or line.get("quantity", 0)
                price = getattr(line, "unit_price", 0.0) or line.get("unit_price", 0.0)
                
                if prod_id == discount.product_id:
                    applicable_subtotal += (qty * price)
                    applicable_qty += qty

            if discount.min_quantity > 0 and applicable_qty < discount.min_quantity:
                return 0.0

            if discount.discount_type == "percentage":
                discount_amount = (applicable_subtotal * discount.value) / 100.0
            else:
                discount_amount = min(discount.value, applicable_subtotal)

        return round(discount_amount, 2)

    @staticmethod
    def record_discount_usage(db: Session, discount_id: int):
        discount = db.query(DiscountRule).filter(DiscountRule.id == discount_id).first()
        if discount:
            discount.used_count += 1
            if discount.usage_limit is not None and discount.used_count >= discount.usage_limit:
                discount.is_active = False
            db.commit()
