/* =========================================================
   HELPERS: LOGIN & LOCALSTORAGE
   ========================================================= */
function currentUser() {
  // Uses the same key your login page saves
  return localStorage.getItem("username");
}
function userIsLoggedIn() {
  return !!currentUser();
}

function savePosts() {
  localStorage.setItem("posts", JSON.stringify(posts));
}
function loadPosts() {
  return JSON.parse(localStorage.getItem("posts") || "[]");
}

/* =========================================================
   DATA MODELS
   ========================================================= */
class Post {
  constructor(id, title, content, author, comments = [], votes = 0) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.author = author;
    this.comments = comments;
    this.votes = votes;
  }
}
class Comment {
  constructor(id, parentId, postId, content, author) {
    this.id = id;
    this.parentId = parentId ?? null;
    this.postId = postId;
    this.content = content;
    this.author = author;
    this.childComments = [];
  }
}

/* =========================================================
   DOM ELEMENTS
   ========================================================= */
const postsContainer      = document.getElementById("posts-container");
const addPostModal        = document.getElementById("add-post-modal");
const showAddPostModalBtn = document.getElementById("show-add-post-modal-btn");
const closeModalBtn       = document.getElementById("close-modal-btn");
const addPostForm         = document.getElementById("add-post-form");

const postDetailContainer = document.getElementById("post-detail");
const commentsContainer   = document.getElementById("comments-container");
const addCommentForm      = document.getElementById("add-comment-form");

/* =========================================================
   INIT POSTS ARRAY
   ========================================================= */
const posts = loadPosts();

/* =========================================================
   MODAL HANDLERS (ADD POST)
   ========================================================= */
showAddPostModalBtn?.addEventListener("click", () => {
  if (!userIsLoggedIn()) {
    alert("Please log in first.");
    window.location.href = "log in.html";   // adjust path if different
    return;
  }
  addPostModal.style.display = "flex";
  document.body.style.overflow = "hidden";
});
closeModalBtn?.addEventListener("click", closeModal);
window.addEventListener("click", (e) => {
  if (e.target === addPostModal) closeModal();
});
function closeModal() {
  addPostModal.style.display = "none";
  document.body.style.overflow = "auto";
}

/* =========================================================
   ADD NEW POST
   ========================================================= */
addPostForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!userIsLoggedIn()) return alert("Please log in.");

  const title   = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();

  if (title && content) {
    posts.unshift(new Post(Date.now(), title, content, currentUser()));
    savePosts();
    renderPosts();
    addPostForm.reset();
    closeModal();
  }
});

/* =========================================================
   RENDER POSTS LIST  (communityspace.html list view)
   ========================================================= */
function renderPosts() {
  if (!postsContainer) return;
  postsContainer.innerHTML = "";

  if (posts.length === 0) {
    postsContainer.innerHTML =
      '<div class="no-posts"><p>No posts yet!</p></div>';
    return;
  }

  posts.forEach((post) => {
    const own = post.author === currentUser();
    const div = document.createElement("div");
    div.className = "post";

    div.innerHTML = `
      <div class="post-votes">
        <button onclick="postVote(${post.id}, 1)">
          <i class="las la-chevron-circle-up"></i>
        </button>
        <span id="votes-${post.id}" class="${voteColor(post.votes)}">
          ${post.votes}
        </span>
        <button onclick="postVote(${post.id}, -1)">
          <i class="las la-chevron-circle-down"></i>
        </button>
      </div>
      <div class="post-content">
        <h2><a href="post(cheefong).html?id=${post.id}">${post.title}</a></h2>
        <p>${post.content}</p>
        <p class="post-meta">by ${post.author}</p>
        ${own ? `<button onclick="deletePost(${post.id})">Delete</button>` : ""}
      </div>
    `;
    postsContainer.appendChild(div);
  });
}
function voteColor(v) {
  if (v === 0) return "";
  return v > 0 ? "positive" : "negative";
}
function postVote(id, delta) {
  const post = posts.find((p) => p.id === id);
  if (!post) return;
  post.votes += delta;
  const span = document.getElementById(`votes-${id}`);
  span.textContent = post.votes;
  span.className = voteColor(post.votes);
  savePosts();
}
function deletePost(id) {
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return;
  if (posts[idx].author !== currentUser()) {
    alert("You can only delete your own posts.");
    return;
  }
  if (!confirm("Delete this post?")) return;
  posts.splice(idx, 1);
  savePosts();
  renderPosts();
}

/* =========================================================
   SINGLE POST (post(cheefong).html)  + COMMENTS
   ========================================================= */
function getPostFromUrl() {
  const p = new URLSearchParams(window.location.search).get("id");
  return posts.find((post) => post.id === Number(p));
}

function renderPostDetail(post) {
  if (!postDetailContainer) return;
  postDetailContainer.innerHTML = `
    <div class="post">
      <div class="post-votes">
        <button onclick="postVote(${post.id}, 1)">
          <i class="las la-chevron-circle-up"></i>
        </button>
        <span id="votes-${post.id}" class="${voteColor(post.votes)}">
          ${post.votes}
        </span>
        <button onclick="postVote(${post.id}, -1)">
          <i class="las la-chevron-circle-down"></i>
        </button>
      </div>
      <div class="post-content">
        <h2>${post.title}</h2>
        <p>${post.content}</p>
        <p class="post-meta">by ${post.author}</p>
      </div>
    </div>
  `;
}

/* ---------- COMMENTS ---------- */
addCommentForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!userIsLoggedIn()) return alert("Please log in to comment.");

  const txt = document.getElementById("comment").value.trim();
  if (!txt) return;
  addComment(null, txt);
  document.getElementById("comment").value = "";
});

function addComment(parentId, text) {
  const post = getPostFromUrl();
  if (!post) return;
  const newC = new Comment(Date.now(), parentId, post.id, text, currentUser());

  if (!parentId) {
    post.comments.push(newC);
  } else {
    const parent = findComment(post.comments, parentId);
    parent?.childComments.push(newC);
  }
  savePosts();
  renderComments(post.comments, commentsContainer);
}

function findComment(list, id) {
  for (const c of list) {
    if (c.id === id) return c;
    const found = findComment(c.childComments, id);
    if (found) return found;
  }
}

function renderComments(list, container, depth = 0) {
  if (!container) return;
  if (depth === 0) container.innerHTML = "";

  list.forEach((c) => {
    const el = document.createElement("div");
    el.className = "comment";
    el.style.marginLeft = `${depth * 20}px`;
    el.innerHTML = `
      <p class="comment-author">${c.author}</p>
      <p class="comment-content">${c.content}</p>
      <button class="comment-reply" data-id="${c.id}"><i class="las la-reply"></i> reply</button>
      ${
        c.author === currentUser()
          ? `<button class="comment-delete" data-id="${c.id}">delete</button>`
          : ""
      }
    `;
    container.appendChild(el);

    el.querySelector(".comment-reply").addEventListener("click", () =>
      showReplyForm(c.id, el)
    );
    el.querySelector(".comment-delete")?.addEventListener("click", () =>
      deleteComment(c.id)
    );

    if (c.childComments.length) {
      renderComments(c.childComments, container, depth + 1);
    }
  });
}

function showReplyForm(parentId, parentEl) {
  if (parentEl.querySelector("form")) return;
  const f = document.createElement("form");
  f.innerHTML = `
    <textarea rows="3" required style="width:100%;"></textarea>
    <button type="submit">Add reply</button>
  `;
  parentEl.appendChild(f);
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const txt = f.querySelector("textarea").value.trim();
    if (txt) addComment(parentId, txt);
    parentEl.removeChild(f);
  });
}

function deleteComment(id) {
  const post = getPostFromUrl();
  if (!post) return;
  const removed = removeCommentRecursive(post.comments, id);
  if (removed) {
    savePosts();
    renderComments(post.comments, commentsContainer);
  }
}
function removeCommentRecursive(list, id) {
  const idx = list.findIndex((c) => c.id === id);
  if (idx !== -1) {
    if (list[idx].author !== currentUser()) {
      alert("You can delete only your own comments.");
      return false;
    }
    list.splice(idx, 1);
    return true;
  }
  for (const c of list) {
    if (removeCommentRecursive(c.childComments, id)) return true;
  }
  return false;
}

/* =========================================================
   INITIAL RENDER (list or single page)
   ========================================================= */
const singlePost = getPostFromUrl();
if (singlePost && postDetailContainer) {
  renderPostDetail(singlePost);
  renderComments(singlePost.comments, commentsContainer);
} else {
  renderPosts(); // list view
}



