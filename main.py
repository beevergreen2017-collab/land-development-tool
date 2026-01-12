from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
import traceback
import sys
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Auto-patch DB on startup to ensure schema consistency
from patch_db import patch_db

@app.on_event("startup")
def on_startup():
    patch_db()

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    print("CAUGHT SQLALCHEMY ERROR:", file=sys.stderr)
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "error_type": exc.__class__.__name__,
            "message": str(exc),
            "hint": "Check database connection or query syntax."
        },
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    print(f"CAUGHT UNHANDLED EXCEPTION ({exc.__class__.__name__}):", file=sys.stderr)
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "error_type": exc.__class__.__name__,
            "message": str(exc),
            "hint": "Internal Server Error. Check backend logs for traceback."
        },
    )

# CORS Configuration
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:8000",
    "http://localhost:8001",
    "https://land-development-tool.vercel.app",  # Vercel production URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/projects/", response_model=schemas.Project)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    db_project = models.Project(**project.dict())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    # Initialize computed fields for response
    db_project.total_area_ping = 0.0
    return db_project

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/projects/", response_model=List[schemas.Project])
def read_projects(
    skip: int = 0, 
    limit: int = 100, 
    search: str = None, 
    include_archived: bool = False,
    sort: str = "recent_updated",
    db: Session = Depends(get_db)
):
    try:
        query = db.query(models.Project)

        # 1. Search (Name)
        if search:
            query = query.filter(models.Project.name.ilike(f"%{search}%"))

        # 2. Archive Filter
        if not include_archived:
            query = query.filter(models.Project.archived_at == None)

        # 3. Sorting
        # 3. Sorting
        from sqlalchemy import func
        
        if sort == "recent_updated":
            # updated_at desc (fallback to created_at), then created_at desc
            query = query.order_by(func.coalesce(models.Project.updated_at, models.Project.created_at).desc(), models.Project.created_at.desc())
        elif sort == "recent_opened":
            # last_opened_at desc (nulls last), then updated_at desc
            query = query.order_by(models.Project.last_opened_at.desc(), func.coalesce(models.Project.updated_at, models.Project.created_at).desc())
        elif sort == "name_asc":
            query = query.order_by(models.Project.name.asc())
        elif sort == "created_desc":
            query = query.order_by(models.Project.created_at.desc())
        # Add Pinned Logic? No, usually Pinned is UI logical partition, but maybe we want pinned first?
        # User requirement says "Sort" dropdown. Pinned is partition 'a. Pinned'. 
        # Usually backend just sorts by criterion, frontend partitions. 
        # But if we paginate, we might need pinned first. 
        # MVP: Frontend partitions. Backend just provides sorted list. 
        # "Sorting... in local is fine". So this backend sort is extra credit but good.

        projects = query.offset(skip).limit(limit).all()
        for p in projects:
            p.total_area_ping = (p.total_area_m2 or 0.0) * 0.3025
        return projects
    except Exception as e:
        print(f"Error in read_projects: {e}", file=sys.stderr)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "error_type": e.__class__.__name__,
                "message": str(e),
                "hint": "Database or calculation error in /projects/"
            }
        )

@app.get("/projects/{project_id}", response_model=schemas.Project)
def read_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Ensure total_area_m2 is up to date (though we update it on write, it's good to be safe or just rely on the stored value)
    # The user asked to "automatically calculate... sum". 
    # Since we store total_area_m2 in the DB and update it on parcel addition, we can just use that.
    # But we need to calculate ping.
    project.total_area_ping = project.total_area_m2 * 0.3025
    return project

@app.put("/projects/{project_id}", response_model=schemas.Project)
def update_project(project_id: int, project_update: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = project_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_project, key, value)
    
    db.commit()
    db.refresh(db_project)
    db_project.total_area_ping = db_project.total_area_m2 * 0.3025
    return db_project

@app.delete("/projects/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete associated land parcels first (cascade delete)
    db.query(models.LandParcel).filter(models.LandParcel.project_id == project_id).delete()
    
    # Delete the project
    db.delete(db_project)
    db.commit()
    return {"message": "Project deleted successfully", "id": project_id}


@app.post("/projects/{project_id}/parcels/", response_model=schemas.LandParcel)
def create_land_parcel(project_id: int, land_parcel: schemas.LandParcelCreate, db: Session = Depends(get_db)):
    # Check if project exists
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db_land_parcel = models.LandParcel(**land_parcel.dict(), project_id=project_id)
    db.add(db_land_parcel)
    db.commit()
    db.refresh(db_land_parcel)
    
    # Recalculate Project total_area_m2
    # We re-query to get all parcels to be sure, or just add the new one. Re-querying is safer.
    parcels = db.query(models.LandParcel).filter(models.LandParcel.project_id == project_id).all()
    total_area = sum(p.area_m2 for p in parcels)
    project.total_area_m2 = total_area
    db.commit()
        
    return db_land_parcel

@app.put("/land_parcels/{parcel_id}", response_model=schemas.LandParcel)
def update_land_parcel(parcel_id: int, parcel_update: schemas.LandParcelUpdate, db: Session = Depends(get_db)):
    db_parcel = db.query(models.LandParcel).filter(models.LandParcel.id == parcel_id).first()
    if not db_parcel:
        raise HTTPException(status_code=404, detail="Land parcel not found")

    update_data = parcel_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_parcel, key, value)
    
    db.commit()
    db.refresh(db_parcel)

    # Recalculate Project total_area_m2
    project = db.query(models.Project).filter(models.Project.id == db_parcel.project_id).first()
    if project:
        parcels = db.query(models.LandParcel).filter(models.LandParcel.project_id == project.id).all()
        project.total_area_m2 = sum(p.area_m2 for p in parcels)
        project.total_area_ping = project.total_area_m2 * 0.3025
        db.commit()

    return db_parcel

import requests
import xml.etree.ElementTree as ET



# 1. District Mapping Constant
TAIPEI_DISTRICTS = {
    "松山區": "A01", "大安區": "A02", "中正區": "A03", "萬華區": "A05",
    "大同區": "A09", "中山區": "A10", "文山區": "A11", "南港區": "A13",
    "內湖區": "A14", "士林區": "A15", "北投區": "A16", "信義區": "A17"
}

# 2. Dynamic Section Lookup Helper
def find_section_code(town_code: str, section_name: str) -> str:
    # API Note: Originally attempted ListTownSection but it returned 404 in app context. 
    # Switching to ListLandSection which is verified to work.
    url = f"https://api.nlsc.gov.tw/other/ListLandSection/A/{town_code}"
    
    try:
        # Add User-Agent just in case
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        # Use verify=False to avoid SSL issues in dev environment
        response = requests.get(url, headers=headers, verify=False)
        
        if response.status_code == 200:
            root = ET.fromstring(response.content)
            items = root.findall(".//sectItem")
            # print(f"Found {len(items)} sections for town {town_code}")
            
            best_fuzzy_match = None
            
            for item in items:
                name_elem = item.find("sectstr")
                code_elem = item.find("sectcode")
                
                if name_elem is not None and code_elem is not None:
                    api_name = name_elem.text.strip()
                    input_name = section_name.strip()
                    
                    # Exact Match (Priority)
                    if api_name == input_name:
                        # print(f"Found EXACT Section Code: {code_elem.text} for {section_name}")
                        return code_elem.text.strip()
                    
                    # Fuzzy Match (Fallback) - Store the first one found
                    if input_name in api_name and best_fuzzy_match is None:
                         best_fuzzy_match = code_elem.text.strip()
                         # print(f"Found FUZZY candidate: {api_name} ({best_fuzzy_match})")
            
            if best_fuzzy_match:
                # print(f"Returning fuzzy match: {best_fuzzy_match}")
                return best_fuzzy_match
                
        else:
            print(f"Section Lookup API failed: {response.status_code}")

    except Exception as e:
        print(f"Error finding section code: {e}")
        return None
    
    return None

@app.get("/proxy/land-info")
def get_land_info(lot_no: str, section_name: str, district: str = "萬華區"):
    # Mapping logic
    sect_code = ""
    city = "A" # Default to Taipei City
    town = ""
    
    # Step 1: District Lookup
    if district in TAIPEI_DISTRICTS:
        town = TAIPEI_DISTRICTS[district]
    else:
        # Fallback or error if not in mapping
        pass 
    
    # Step 2: Dynamic Section Lookup
    if town:
        found_code = find_section_code(town, section_name)
        if found_code:
            sect_code = found_code
    
    if not town or not sect_code:
        if not town:
             raise HTTPException(status_code=400, detail=f"目前僅支援台北市 (Received: {district})")
        if not sect_code:
             raise HTTPException(status_code=400, detail=f"Section '{section_name}' not supported or found in {district}.")

    # Format lot_no to 8 digits (e.g. 265 -> 02650000)
    try:
        if "-" in lot_no:
            main, sub = lot_no.split("-")
            formatted_lot_no = f"{int(main):04d}{int(sub):04d}"
        else:
            formatted_lot_no = f"{int(lot_no):04d}0000"
    except ValueError:
         raise HTTPException(status_code=400, detail="Invalid lot number format.")

    url = "https://api.nlsc.gov.tw/other/ParcelQuery"
    params = {
        "lcode": city,
        "tcode": town,
        "scode": sect_code,
        "lodcode": formatted_lot_no
    }
    
    # Debug Logging
    full_url = requests.Request('GET', url, params=params).prepare().url
    print(f"DEBUG URL: {full_url}")

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        response = requests.get(url, params=params, headers=headers, verify=False)
        
        if response.status_code != 200:
            print(f"API Error Response: {response.text}")
            
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Parcel not found in external API.")
        raise HTTPException(status_code=500, detail=f"External API error: {str(e)}")
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"External API error: {str(e)}")

    # Parse XML
    try:
        root = ET.fromstring(response.content)
        
        area_elem = root.find(".//area")
        price_elem = root.find(".//price")
        
        if area_elem is None or price_elem is None:
             # Sometimes the API returns 200 but with empty or error XML
             print(f"XML Content: {response.text}")
             raise HTTPException(status_code=404, detail="Data not found in external API response.")

        return {
            "area": float(area_elem.text),
            "price": float(price_elem.text)
        }
    except ET.ParseError:
        print(f"XML Parse Error. Content: {response.text}")
        raise HTTPException(status_code=500, detail="Failed to parse external API response.")

