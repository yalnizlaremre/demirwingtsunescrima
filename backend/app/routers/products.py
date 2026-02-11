from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user, require_admin_or_above
from app.models.user import User
from app.models.product import Product, ProductCategory
from app.schemas.product import (
    ProductCategoryCreate, ProductCategoryResponse,
    ProductCreate, ProductUpdate, ProductResponse, ProductListResponse,
)

router = APIRouter()


# --- Categories ---

@router.get("/categories", response_model=list[ProductCategoryResponse])
async def list_categories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ProductCategory).order_by(ProductCategory.name))
    categories = result.scalars().all()
    return [
        ProductCategoryResponse(
            id=str(c.id),
            name=c.name,
            description=c.description,
            created_at=c.created_at,
        )
        for c in categories
    ]


@router.post("/categories", response_model=ProductCategoryResponse)
async def create_category(
    data: ProductCategoryCreate,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    cat = ProductCategory(name=data.name, description=data.description)
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return ProductCategoryResponse(
        id=str(cat.id),
        name=cat.name,
        description=cat.description,
        created_at=cat.created_at,
    )


# --- Products ---

@router.get("/", response_model=ProductListResponse)
async def list_products(
    category_id: str | None = None,
    search: str | None = None,
    is_active: bool | None = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product)
    count_query = select(func.count(Product.id))

    if category_id:
        query = query.where(Product.category_id == category_id)
        count_query = count_query.where(Product.category_id == category_id)
    if search:
        query = query.where(Product.name.ilike(f"%{search}%"))
        count_query = count_query.where(Product.name.ilike(f"%{search}%"))
    if is_active is not None:
        query = query.where(Product.is_active == is_active)
        count_query = count_query.where(Product.is_active == is_active)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    result = await db.execute(
        query.order_by(Product.created_at.desc()).offset(skip).limit(limit)
    )
    products = result.scalars().all()

    return ProductListResponse(
        items=[
            ProductResponse(
                id=str(p.id),
                name=p.name,
                category_id=str(p.category_id) if p.category_id else None,
                description=p.description,
                image_url=p.image_url,
                sizes=p.sizes,
                is_active=p.is_active,
                created_at=p.created_at,
                category_name=p.category.name if p.category else None,
            )
            for p in products
        ],
        total=total,
    )


@router.post("/", response_model=ProductResponse)
async def create_product(
    data: ProductCreate,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    product = Product(
        name=data.name,
        category_id=data.category_id,
        description=data.description,
        image_url=data.image_url,
        sizes=data.sizes,
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)

    return ProductResponse(
        id=str(product.id),
        name=product.name,
        category_id=str(product.category_id) if product.category_id else None,
        description=product.description,
        image_url=product.image_url,
        sizes=product.sizes,
        is_active=product.is_active,
        created_at=product.created_at,
    )


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    data: ProductUpdate,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)

    return ProductResponse(
        id=str(product.id),
        name=product.name,
        category_id=str(product.category_id) if product.category_id else None,
        description=product.description,
        image_url=product.image_url,
        sizes=product.sizes,
        is_active=product.is_active,
        created_at=product.created_at,
    )


@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")

    await db.delete(product)
    await db.commit()
    return {"message": "Ürün silindi"}
