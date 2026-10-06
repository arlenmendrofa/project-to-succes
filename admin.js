import { ADMIN_EMAIL, auth, db } from "./firebase.js";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const loginView = document.querySelector("#login-view");
const adminView = document.querySelector("#admin-view");
const loginStatus = document.querySelector("#login-status");
const adminStatus = document.querySelector("#admin-status");
const signInButton = document.querySelector("#sign-in");
const signOutButton = document.querySelector("#sign-out");
const userLabel = document.querySelector("#signed-in-user");
const form = document.querySelector("#project-form");
const formHeading = document.querySelector("#form-heading");
const saveButton = document.querySelector("#save-project");
const cancelEditButton = document.querySelector("#cancel-edit");
const projectList = document.querySelector("#project-list");
const provider = new GoogleAuthProvider();

let editingId = null;
let stopListening = null;

function showStatus(element, message, isError = false) {
  element.textContent = message;
  element.dataset.error = String(isError);
}

function resetForm() {
  form.reset();
  form.elements.published.checked = true;
  editingId = null;
  formHeading.textContent = "Tambah proyek";
  saveButton.textContent = "Simpan proyek";
  cancelEditButton.hidden = true;
}

function httpsUrl(value, fieldName) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${fieldName} harus berupa URL yang valid.`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`${fieldName} harus menggunakan HTTPS.`);
  }
  return parsed.href;
}

function beginListening() {
  stopListening?.();
  stopListening = onSnapshot(
    collection(db, "projects"),
    (snapshot) => {
      const projects = snapshot.docs
        .map((projectDoc) => ({ id: projectDoc.id, ...projectDoc.data() }))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      renderProjects(projects);
      showStatus(adminStatus, `${projects.length} proyek ditemukan.`);
    },
    (error) => {
      console.error("Gagal memuat proyek:", error);
      showStatus(adminStatus, "Daftar proyek gagal dimuat. Periksa aturan Firestore.", true);
    },
  );
}

function renderProjects(projects) {
  projectList.replaceChildren();
  if (projects.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "muted";
    emptyMessage.textContent = "Belum ada proyek. Tambahkan proyek pertama melalui formulir di atas.";
    projectList.append(emptyMessage);
    return;
  }

  for (const project of projects) {
    const item = document.createElement("article");
    item.className = "project-item";

    const details = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = project.title;
    const description = document.createElement("p");
    description.textContent = `${project.category} · ${project.published ? "Tampil di website" : "Draft"}`;
    details.append(title, description);

    const actions = document.createElement("div");
    actions.className = "project-actions";
    const editButton = document.createElement("button");
    editButton.className = "button secondary";
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => editProject(project));

    const deleteButton = document.createElement("button");
    deleteButton.className = "button danger";
    deleteButton.type = "button";
    deleteButton.textContent = "Hapus";
    deleteButton.addEventListener("click", () => removeProject(project));

    actions.append(editButton, deleteButton);
    item.append(details, actions);
    projectList.append(item);
  }
}

function editProject(project) {
  editingId = project.id;
  form.elements.title.value = project.title;
  form.elements.category.value = project.category;
  form.elements.description.value = project.description;
  form.elements.imageUrl.value = project.imageUrl;
  form.elements.link.value = project.link;
  form.elements.published.checked = project.published;
  formHeading.textContent = "Edit proyek";
  saveButton.textContent = "Simpan perubahan";
  cancelEditButton.hidden = false;
  form.elements.title.focus();
}

async function removeProject(project) {
  if (!window.confirm(`Hapus proyek "${project.title}"?`)) return;

  try {
    await deleteDoc(doc(db, "projects", project.id));
    showStatus(adminStatus, "Proyek berhasil dihapus.");
  } catch (error) {
    console.error("Gagal menghapus proyek:", error);
    showStatus(adminStatus, "Proyek gagal dihapus. Periksa akses Firestore.", true);
  }
}

async function handleAuthState(user) {
  if (!user) {
    stopListening?.();
    stopListening = null;
    loginView.hidden = false;
    adminView.hidden = true;
    userLabel.textContent = "";
    return;
  }

  if (user.email?.toLowerCase() !== ADMIN_EMAIL || !user.emailVerified) {
    showStatus(loginStatus, "Akun ini tidak diizinkan mengelola proyek.", true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Gagal mengakhiri sesi pengguna yang tidak berwenang:", error);
      showStatus(loginStatus, "Akun tidak diizinkan dan sesi gagal ditutup. Tutup halaman ini.", true);
    }
    return;
  }

  loginView.hidden = true;
  adminView.hidden = false;
  userLabel.textContent = `Masuk sebagai ${user.email}`;
  beginListening();
}

signInButton.addEventListener("click", async () => {
  signInButton.disabled = true;
  showStatus(loginStatus, "Menghubungkan ke Google...");
  try {
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error("Google sign-in gagal:", error);
    showStatus(loginStatus, "Login gagal. Coba lagi atau periksa konfigurasi domain Firebase.", true);
  } finally {
    signInButton.disabled = false;
  }
});

signOutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
    showStatus(loginStatus, "Anda sudah keluar.");
    resetForm();
  } catch (error) {
    console.error("Gagal keluar:", error);
    showStatus(adminStatus, "Gagal keluar. Coba muat ulang halaman.", true);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  showStatus(adminStatus, "Menyimpan proyek...");

  try {
    const project = {
      title: form.elements.title.value.trim(),
      category: form.elements.category.value.trim(),
      description: form.elements.description.value.trim(),
      imageUrl: httpsUrl(form.elements.imageUrl.value, "URL gambar"),
      link: httpsUrl(form.elements.link.value, "Link proyek"),
      published: form.elements.published.checked,
      updatedAt: serverTimestamp(),
    };

    if (!project.title || !project.category || !project.description) {
      throw new Error("Nama, kategori, dan deskripsi wajib diisi.");
    }

    if (editingId) {
      await updateDoc(doc(db, "projects", editingId), project);
      showStatus(adminStatus, "Perubahan proyek berhasil disimpan.");
    } else {
      await addDoc(collection(db, "projects"), {
        ...project,
        createdAt: serverTimestamp(),
      });
      showStatus(adminStatus, "Proyek berhasil ditambahkan.");
    }
    resetForm();
  } catch (error) {
    console.error("Gagal menyimpan proyek:", error);
    showStatus(
      adminStatus,
      error instanceof Error ? error.message : "Proyek gagal disimpan. Periksa akses Firestore.",
      true,
    );
  } finally {
    saveButton.disabled = false;
  }
});

cancelEditButton.addEventListener("click", resetForm);
getRedirectResult(auth).catch((error) => {
  console.error("Hasil Google sign-in gagal diproses:", error);
  showStatus(loginStatus, "Login Google gagal diproses. Coba masuk kembali.", true);
});
onAuthStateChanged(auth, (user) => {
  void handleAuthState(user).catch((error) => {
    console.error("Gagal memeriksa status login:", error);
    showStatus(loginStatus, "Status login gagal diperiksa. Muat ulang halaman.", true);
  });
});
