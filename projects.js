import { db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const projectGrid = document.querySelector(".project-grid");
const projectStatus = document.querySelector("#project-status");

function isHttpsUrl(value) {
  if (typeof value !== "string" || !value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function createProjectCard(project, index) {
  const card = document.createElement("article");
  card.className = "project-card";

  const thumbnail = document.createElement("div");
  thumbnail.className = "project-thumb";
  if (isHttpsUrl(project.imageUrl)) {
    const image = document.createElement("img");
    image.src = project.imageUrl;
    image.alt = project.title;
    image.loading = "lazy";
    thumbnail.append(image);
  } else {
    thumbnail.textContent = String(index + 1).padStart(2, "0");
  }

  const body = document.createElement("div");
  body.className = "project-body";
  const title = document.createElement("h3");
  if (isHttpsUrl(project.link)) {
    const link = document.createElement("a");
    link.href = project.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = project.title;
    title.append(link);
  } else {
    title.textContent = project.title;
  }

  const description = document.createElement("p");
  description.textContent = project.description;
  const category = document.createElement("span");
  category.className = "tag";
  category.textContent = project.category;
  body.append(title, description, category);
  card.append(thumbnail, body);
  return card;
}

onSnapshot(
  query(collection(db, "projects"), where("published", "==", true)),
  (snapshot) => {
    const projects = snapshot.docs
      .map((projectDoc) => projectDoc.data())
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));

    projectGrid.replaceChildren();
    if (projects.length === 0) {
      projectStatus.textContent = "Belum ada proyek yang dipublikasikan.";
      projectGrid.append(projectStatus);
      return;
    }

    projectStatus.remove();
    projects.forEach((project, index) => {
      projectGrid.append(createProjectCard(project, index));
    });
  },
  (error) => {
    console.error("Gagal memuat proyek publik:", error);
    projectStatus.textContent = "Proyek belum dapat dimuat. Silakan coba lagi nanti.";
  },
);
