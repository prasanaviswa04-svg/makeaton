from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Product, ProductVariant, User, ActivityLog
from backend.auth import require_admin, require_staff_or_admin
from backend.schemas import ProductOut, ProductCreate, ProductUpdate, ProductVariantCreate, ProductVariantOut

router = APIRouter(prefix="/api/products", tags=["Products & Variants"])

@router.get("", response_model=List[ProductOut])
def list_products(
    is_active: Optional[bool] = None,
    product_type: Optional[str] = None,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
    if product_type:
        query = query.filter(Product.product_type == product_type)
    return query.order_by(Product.name.asc()).all()

@router.get("/{product_id}", response_model=ProductOut)
def get_product(
    product_id: int,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found.")
    return prod

@router.post("", response_model=ProductOut)
def create_product(
    payload: ProductCreate,
    current_user: User = Depends(require_admin),  # Admin sets up products
    db: Session = Depends(get_db)
):
    product = Product(
        name=payload.name,
        product_type=payload.product_type,
        sales_price=payload.sales_price,
        cost_price=payload.cost_price,
        notes=payload.notes,
        is_active=payload.is_active
    )
    db.add(product)
    db.flush()

    for v in payload.variants or []:
        variant = ProductVariant(
            product_id=product.id,
            attribute_name=v.attribute_name,
            attribute_value=v.attribute_value,
            price_extra=v.price_extra,
            is_active=v.is_active
        )
        db.add(variant)

    db.commit()
    db.refresh(product)

    log = ActivityLog(
        user_id=current_user.id,
        action="PRODUCT_CREATED",
        entity_type="product",
        entity_id=product.id,
        details=f"Admin {current_user.email} created product '{product.name}' with {len(product.variants)} variants."
    )
    db.add(log)
    db.commit()

    return product

@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found.")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(prod, k, v)

    db.commit()
    db.refresh(prod)
    return prod

@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found.")
    
    prod.is_active = False  # soft-delete for referential integrity
    db.commit()
    return {"message": "Product deactivated successfully."}

@router.post("/{product_id}/variants", response_model=ProductVariantOut)
def add_product_variant(
    product_id: int,
    payload: ProductVariantCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found.")

    variant = ProductVariant(
        product_id=prod.id,
        attribute_name=payload.attribute_name,
        attribute_value=payload.attribute_value,
        price_extra=payload.price_extra,
        is_active=payload.is_active
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant

@router.delete("/variants/{variant_id}")
def delete_product_variant(
    variant_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    v = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Variant not found.")
    db.delete(v)
    db.commit()
    return {"message": "Variant deleted successfully."}
