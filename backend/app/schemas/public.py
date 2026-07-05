from pydantic import BaseModel


class PublicInstructorResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    instructor_title: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    instagram_url: str | None = None

    model_config = {"from_attributes": True}


class PublicInstructorListResponse(BaseModel):
    items: list[PublicInstructorResponse]
