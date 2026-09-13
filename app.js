// --- 初期データ & 変数宣言 ---
let recipes = JSON.parse(localStorage.getItem('recipes')) || [];
let currentImageData = ''; // ベース64エンコードされた画像データ

// DOM要素取得
const recipeForm = document.getElementById('recipe-form');
const recipeIdInput = document.getElementById('recipe-id');
const titleInput = document.getElementById('title');
const categoryInput = document.getElementById('category');
const ingredientsList = document.getElementById('ingredients-list');
const stepsList = document.getElementById('steps-list');
const imageFileInput = document.getElementById('image-file');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');
const memoInput = document.getElementById('memo');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');

const recipeListContainer = document.getElementById('recipe-list');
const searchKeyword = document.getElementById('search-keyword');
const filterCategory = document.getElementById('filter-category');

// モーダル要素
const recipeModal = document.getElementById('recipe-modal');
const modalClose = document.getElementById('modal-close');
const modalImage = document.getElementById('modal-image');
const modalTitle = document.getElementById('modal-title');
const modalCategory = document.getElementById('modal-category');
const modalIngredients = document.getElementById('modal-ingredients');
const modalSteps = document.getElementById('modal-steps');
const modalMemo = document.getElementById('modal-memo');
const modalMemoContainer = document.getElementById('modal-memo-container');

// 初期起動処理
document.addEventListener('DOMContentLoaded', () => {
  resetForm();
  renderRecipes();
});

// --- 動的フォーム（食材・手順） ---

// 食材行の追加
function addIngredientRow(value = '') {
  const div = document.createElement('div');
  div.className = 'dynamic-row';
  div.innerHTML = `
    <input type="text" class="ingredient-input" placeholder="例: 人参 1本" value="${value}">
    <button type="button" class="btn-danger-sm remove-row-btn">削除</button>
  `;
  div.querySelector('.remove-row-btn').addEventListener('click', () => div.remove());
  ingredientsList.appendChild(div);
}

// 作り方（手順）行の追加（手順番号を自動採番）
function addStepRow(value = '') {
  const div = document.createElement('div');
  div.className = 'dynamic-row step-row';
  div.innerHTML = `
    <span class="step-number"></span>
    <input type="text" class="step-input" placeholder="手順を入力してください" value="${value}">
    <button type="button" class="btn-danger-sm remove-row-btn">削除</button>
  `;
  div.querySelector('.remove-row-btn').addEventListener('click', () => {
    div.remove();
    updateStepNumbers(); // 削除時に番号を自動再計算
  });
  stepsList.appendChild(div);
  updateStepNumbers();
}

// 手順番号の更新
function updateStepNumbers() {
  const stepRows = stepsList.querySelectorAll('.step-row');
  stepRows.forEach((row, index) => {
    const numSpan = row.querySelector('.step-number');
    numSpan.textContent = `手順${index + 1}:`;
  });
}

document.getElementById('add-ingredient-btn').addEventListener('click', () => addIngredientRow());
document.getElementById('add-step-btn').addEventListener('click', () => addStepRow());

// --- 画像アップロード処理 (JPG/PNG対応) ---
imageFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      currentImageData = event.target.result;
      imagePreview.src = currentImageData;
      imagePreviewContainer.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  }
});

removeImageBtn.addEventListener('click', () => {
  currentImageData = '';
  imageFileInput.value = '';
  imagePreview.src = '';
  imagePreviewContainer.style.display = 'none';
});

// --- レシピ保存・更新 ---
recipeForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const id = recipeIdInput.value || Date.now().toString();
  const title = titleInput.value.trim();
  const category = categoryInput.value;

  // 食材の配列取得
  const ingredients = Array.from(document.querySelectorAll('.ingredient-input'))
    .map(input => input.value.trim())
    .filter(val => val !== '');

  // 手順の配列取得
  const steps = Array.from(document.querySelectorAll('.step-input'))
    .map(input => input.value.trim())
    .filter(val => val !== '');

  const memo = memoInput.value.trim();

  const recipeData = {
    id,
    title,
    category,
    ingredients,
    steps,
    image: currentImageData,
    memo
  };

  const existingIndex = recipes.findIndex(r => r.id === id);
  if (existingIndex > -1) {
    recipes[existingIndex] = recipeData;
  } else {
    recipes.push(recipeData);
  }

  saveAndRefresh();
  resetForm();
});

function saveAndRefresh() {
  localStorage.setItem('recipes', JSON.stringify(recipes));
  renderRecipes();
}

function resetForm() {
  recipeIdInput.value = '';
  titleInput.value = '';
  categoryInput.value = '';
  ingredientsList.innerHTML = '';
  stepsList.innerHTML = '';
  currentImageData = '';
  imageFileInput.value = '';
  imagePreview.src = '';
  imagePreviewContainer.style.display = 'none';
  memoInput.value = '';
  
  document.getElementById('form-title').textContent = '新規レシピ追加';
  submitBtn.textContent = 'レシピを保存';
  cancelBtn.style.display = 'none';

  // 初期の入力項目を用意
  addIngredientRow();
  addStepRow();
}

cancelBtn.addEventListener('click', resetForm);

// --- レシピ一覧表示 ---
function renderRecipes() {
  recipeListContainer.innerHTML = '';

  const keyword = searchKeyword.value.toLowerCase();
  const selectedCategory = filterCategory.value;

  const filtered = recipes.filter(r => {
    const matchesKeyword = r.title.toLowerCase().includes(keyword) ||
                           r.ingredients.some(i => i.toLowerCase().includes(keyword));
    const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
    return matchesKeyword && matchesCategory;
  });

  if (filtered.length === 0) {
    recipeListContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #777;">レシピが見つかりません</p>';
    return;
  }

  filtered.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    
    // デフォルト画像または読み込んだ画像
    const imgSrc = recipe.image || 'https://via.placeholder.com/300x200?text=No+Image';

    card.innerHTML = `
      <img src="${imgSrc}" class="card-img" alt="${recipe.title}">
      <div class="card-content">
        <span class="badge">${recipe.category}</span>
        <div class="card-title">${recipe.title}</div>
        <div class="card-actions">
          <button class="btn-edit">編集</button>
          <button class="btn-delete">削除</button>
        </div>
      </div>
    `;

    // カード本体クリックで全画面表示モーダルを開く
    card.addEventListener('click', (e) => {
      // 編集・削除ボタンが押された時はモーダルを開かない
      if (e.target.classList.contains('btn-edit') || e.target.classList.contains('btn-delete')) {
        return;
      }
      openModal(recipe);
    });

    // 編集ボタン
    card.querySelector('.btn-edit').addEventListener('click', (e) => {
      e.stopPropagation();
      loadRecipeToForm(recipe);
    });

    // 削除ボタン
    card.querySelector('.btn-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`「${recipe.title}」を削除してもよろしいですか？`)) {
        recipes = recipes.filter(r => r.id !== recipe.id);
        saveAndRefresh();
      }
    });

    recipeListContainer.appendChild(card);
  });
}

// フォームにレシピデータを読み込んで編集モードにする
function loadRecipeToForm(recipe) {
  recipeIdInput.value = recipe.id;
  titleInput.value = recipe.title;
  categoryInput.value = recipe.category;
  memoInput.value = recipe.memo || '';

  ingredientsList.innerHTML = '';
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    recipe.ingredients.forEach(i => addIngredientRow(i));
  } else {
    addIngredientRow();
  }

  stepsList.innerHTML = '';
  if (recipe.steps && recipe.steps.length > 0) {
    recipe.steps.forEach(s => addStepRow(s));
  } else {
    addStepRow();
  }

  currentImageData = recipe.image || '';
  if (currentImageData) {
    imagePreview.src = currentImageData;
    imagePreviewContainer.style.display = 'flex';
  } else {
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
  }

  document.getElementById('form-title').textContent = 'レシピを編集';
  submitBtn.textContent = '変更を更新';
  cancelBtn.style.display = 'inline-block';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- 検索イベントフィードバック ---
searchKeyword.addEventListener('input', renderRecipes);
filterCategory.addEventListener('change', renderRecipes);

// --- 全画面モーダル機能 ---
function openModal(recipe) {
  modalTitle.textContent = recipe.title;
  modalCategory.textContent = recipe.category;

  if (recipe.image) {
    modalImage.src = recipe.image;
    modalImage.style.display = 'block';
  } else {
    modalImage.style.display = 'none';
  }

  // 材料リスト生成
  modalIngredients.innerHTML = '';
  recipe.ingredients.forEach(ing => {
    const li = document.createElement('li');
    li.textContent = ing;
    modalIngredients.appendChild(li);
  });

  // 手順リスト生成
  modalSteps.innerHTML = '';
  recipe.steps.forEach(step => {
    const li = document.createElement('li');
    li.textContent = step;
    modalSteps.appendChild(li);
  });

  // メモ生成
  if (recipe.memo) {
    modalMemo.textContent = recipe.memo;
    modalMemoContainer.style.display = 'block';
  } else {
    modalMemoContainer.style.display = 'none';
  }

  recipeModal.style.display = 'block';
  document.body.style.overflow = 'hidden'; // 背景スクロール固定
}

function closeModal() {
  recipeModal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

modalClose.addEventListener('click', closeModal);

// モーダルの背景外側クリックで閉じる
recipeModal.addEventListener('click', (e) => {
  if (e.target === recipeModal) {
    closeModal();
  }
});
