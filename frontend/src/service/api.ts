import { msalInstance, tokenRequest } from "../configs/msalAuthConfig";
import {
  CategoryResponse,
  CreateEventRequest,
  CreateUserRequest,
  EditCategoryRequest,
  EditEventRequest,
  EditUserRequest,
  EventResponse,
  LoginRequest,
  LoginResponse,
  MatchRequest,
  Role,
  UserResponse,
} from "../gen-types";
import { Id, ErrorResponse } from "../types";

const baseUrl = import.meta.env.PROD ? import.meta.env.VITE_API_URL : "/api";

function makeUrl(path: string) {
  return `${baseUrl}${path}`;
}

//GET
export async function getEvents(): Promise<EventResponse[]> {
  const headers = await getHeaders();
  const response = await fetch(makeUrl("/events"), {
    headers,
  });
  if (response.status === 200) {
    const events = response.json();
    console.log(events);
    return events;
  } else {
    console.log("Cannot fetch events");
  }
}

async function getHeaders() {
  const headers = new Headers();
  if (localStorage.getItem(accessTokenKey)) {
    headers.append("Authorization", `Bearer ${localStorage.getItem(accessTokenKey)}`);
  } else if (msalInstance.getActiveAccount()) {
    const token = await msalInstance.acquireTokenSilent(tokenRequest);
    headers.append("Authorization", `Bearer ${token.accessToken}`);
  }
  return headers;
}

export async function getCategories(): Promise<CategoryResponse[]> {
  const response = await fetch(makeUrl("/categories"));
  if (response.status === 200) {
    const categories = response.json();
    return categories;
  } else {
    console.log("Cannot fetch events");
  }
}

export async function getLecturerCategories(): Promise<CategoryResponse[]> {
  const response = await fetch(makeUrl("/categories/lecturer"), {
    headers: {
      Authorization: `Bearer ${localStorage.getItem(accessTokenKey)}`,
    },
  });
  if (response.status === 200) {
    const categories = response.json();
    return categories;
  } else {
    console.log("Cannot fetch events");
  }
}

//CREATE
export async function createEvent(newEvent: CreateEventRequest, file: File): Promise<EventResponse> {
  const token = localStorage.getItem(accessTokenKey);
  const formData = new FormData();
  for (const [key, value] of Object.entries(newEvent)) {
    formData.append(key, value);
  }
  if (file) {
    formData.append("file", file);
  }

  console.log(formData);

  const response = await fetch(makeUrl("/events"), {
    method: "POST",
    headers: {
      ...(token && {
        Authorization: `Bearer ${token}`,
      }),
    },
    body: formData,
  });

  const data = await response.json();
  if (response.status === 201) {
    return data;
  } else if (response.status === 400) {
    throw data;
  } else {
    console.log("Cannot create event");
  }
}

//DELETE
export async function deleteEvent(id: Id) {
  const response = await fetch(makeUrl(`/events/${id}`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem(accessTokenKey)}`,
    },
  });

  if (response.status === 200) {
    return true;
  } else {
    console.log("Cannot delete event");
    return false;
  }
}

//UPDATE
// null means delete file
// undefined means no change
export async function updateEvent(id: Id, editEvent: EditEventRequest, file?: File | null): Promise<EventResponse> {
  const formData = new FormData();
  for (const [key, value] of Object.entries(editEvent)) {
    formData.append(key, value);
  }
  if (file) {
    formData.append("file", file);
  } else if (file === null) {
    formData.append("file", new File([], ""));
  }

  console.log(file);
  
  console.log(formData);
  

  const response = await fetch(makeUrl(`/events/${id}`), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${localStorage.getItem(accessTokenKey)}`,
    },
    body: formData,
  });
  if (response.status === 200) {
    const updatedEvent = await response.json();
    return updatedEvent;
  } else {
    console.log("Cannot edit event");
  }
}

export async function getEventsByCategoryIdOnDate(categoryId: Id, startAt: string): Promise<EventResponse[]> {
  const response = await fetch(
    makeUrl(`/events?categoryId=${categoryId}&startAt=${startAt}`), {
      headers: {
        Authorization: `Bearer ${localStorage.getItem(accessTokenKey)}`,
      },
    },
  );
  if (response.status === 200) {
    const events = response.json();
    return events;
  } else {
    console.log("Cannot fetch events");
  }
}

export async function getEventsByCategoryId(categoryId: Id): Promise<EventResponse[]> {
  const response = await fetch(makeUrl(`/events?categoryId=${categoryId}`), {
    headers: {
      Authorization: `Bearer ${localStorage.getItem(accessTokenKey)}`,
    },
  });
  if (response.status === 200) {
    const events = response.json();
    return events;
  } else {
    console.log("Cannot fetch events");
  }
}

interface GetEventsFilter {
  categoryId?: Id;
  type?: string;
  startAt?: string;
}

export async function getEventsByFilter(filter: GetEventsFilter): Promise<EventResponse[]> {
  const { categoryId, type, startAt } = filter;

  let uri = "/events?";
  const filters = [];

  if (categoryId) {
    filters.push(`categoryId=${categoryId}`);
  }

  if (type) {
    filters.push(`type=${type}`);
  }

  if (startAt) {
    filters.push(`startAt=${startAt}`);
  }

  if (filters.length > 0) {
    uri += filters.join("&");
  }

  const response = await fetch(makeUrl(uri), {
    headers: {
      Authorization: `Bearer ${localStorage.getItem(accessTokenKey)}`,
    },
  });
  if (response.status === 200) {
    const events = response.json();
    return events;
  } else {
    console.log("Cannot fetch events");
  }
}

export async function updateCategory(id: Id, editCategory: EditCategoryRequest): Promise<CategoryResponse> {
  const response = await fetch(makeUrl(`/categories/${id}`), {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(editCategory),
  });
  if (response.status === 200) {
    const updatedCategory = await response.json();
    return updatedCategory;
  } else {
    console.log("Cannot edit category");
  }
}

export const accessTokenKey = "accessToken";
interface GetUsersOptions {
  onUnauthorized?: () => void;
}
export async function getUsers(options: GetUsersOptions = {
}): Promise<UserResponse[]> {
  const { onUnauthorized } = options;
  const headers = await getHeaders();
  const response = await fetch(makeUrl("/users"), {
    headers,
  });
  if (response.status === 200) {
    const users = response.json();
    return users;
  } else if (response.status === 401) {
    const { error } = await refreshAccessToken();
    if (error) {
      onUnauthorized();
      return;
    }

    return getUsers(options);
  } else {
    console.log("Cannot fetch users");
  }
}

interface RefreshTokenResponse {
  accessToken: string;
  error: Error | null;
}
async function refreshAccessToken(): Promise<RefreshTokenResponse> {
  const response = await fetch(makeUrl("/auth/refresh"), {
    method: "POST",
  });

  if (response.status === 200) {
    const data = await response.json();
    localStorage.setItem(accessTokenKey, data.accessToken);
    console.log("Refreshed access token");
    return {
      accessToken: data.accessToken,
      error: null,
    };
  } else {
    // TODO: clear auth data in useAuth when refresh token is expired
    return {
      accessToken: null,
      error: new Error("Cannot refresh access token"),
    };
  }
}

export async function getRoles(): Promise<Role[]> {
  const headers = await getHeaders();
  const response = await fetch(makeUrl("/users/roles"), {
    headers: headers,
  });
  if (response.status === 200) {
    const roles = response.json();
    return roles;
  } else {
    console.log("Cannot fetch user roles");
  }
}

export async function createUser(newUser: CreateUserRequest): Promise<UserResponse> {
  const trimmedUser = {
    ...newUser,
    name: newUser.name.trim(),
    email: newUser.email.trim(),
  };

  const response = await fetch(makeUrl("/users"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem(accessTokenKey)}`,
    },
    body: JSON.stringify(trimmedUser),
  });

  const data = await response.json();
  if (response.status === 201) {
    return data;
  } else if (response.status === 400) {
    throw data;
  } else {
    console.log("Cannot create user");
  }
}

export async function deleteUser(id: Id) {
  const response = await fetch(makeUrl(`/users/${id}`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem(accessTokenKey)}`,
    },
  });

  if (response.status === 204) {
    return true;
  } else {
    console.log("Cannot delete user");
    return false;
  }
}

export async function updateUser(id: Id, changes: EditUserRequest): Promise<UserResponse> {
  const response = await fetch(makeUrl(`/users/${id}`), {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${localStorage.getItem(accessTokenKey)}`,
    },
    body: JSON.stringify(changes),
  });
  if (response.status === 200) {
    const updatedUser = await response.json();
    return updatedUser;
  } else {
    console.log("Cannot edit user");
  }
}

export async function match(matchRequest: MatchRequest) {
  const response = await fetch(makeUrl("/auth/match"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(matchRequest),
  });

  if (response.status === 200) {
    return true;
  } else if (response.status === 401) {
    return false;
  } else if (response.status === 404) {
    const data = await response.json();
    throw new Error(data.message);
  } else {
    console.log("Cannot match password");
  }
}

interface LoginOptions {
  onSuccess?: (r: LoginResponse) => void;
  onUnauthorized?: (r: ErrorResponse) => void;
  onNotFound?: (r: ErrorResponse) => void;
}

export async function login(loginRequest: LoginRequest, options: LoginOptions = {
}): Promise<void> {
  const { onSuccess, onUnauthorized, onNotFound } = options;
  const response = await fetch(makeUrl("/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(loginRequest),
  });

  const data = await response.json();
  if (response.status === 200) {
    localStorage.setItem(accessTokenKey, data.accessToken);
    onSuccess(data as LoginResponse);
  } else if (response.status === 401) {
    onUnauthorized(data as ErrorResponse);
  } else if (response.status === 404) {
    onNotFound(data as ErrorResponse);
  } else {
    console.log("Cannot login");
  }
}

export async function logout() {
  const response = await fetch(makeUrl("/auth/logout"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (response.status === 200) {
    localStorage.removeItem(accessTokenKey);
    return true;
  } else {
    console.log("Cannot logout");
    return false;
  }
}

export async function getFilenameByBucketUuid(uuid: string) {
  const response = await fetch(makeUrl(`/events/files/${uuid}?noContent=true`), {
    headers: {
      Authorization: `Bearer ${localStorage.getItem(accessTokenKey)}`,
    },
  });

  if (response.status === 200) {
    // get filename from content-disposition header
    const filename = response.headers.get("content-disposition").split("filename=")[1];
    return filename;
  } else {
    console.log("Cannot get file");
  }
}

export function getBucketURL(uuid: string) {
  return makeUrl(`/events/files/${uuid}`);
}