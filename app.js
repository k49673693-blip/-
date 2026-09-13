let recipes = JSON.parse(localStorage.getItem('my_recipes')) || [];

// DOM要素
const recipeForm = document.getElementById('recipe-form');
const formTitle = document.getElementById('form-title');
const recipeIdInput = document.getElementById('recipe-id');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');

const ingredientsList = document.getElementById('ingredients-list');
const addIngredientBtn = document.getElementById('add-ingredient-btn');

const recipeList = document.getElementById('recipe-list');
const searchKeyword = document.getElementById('search-keyword');
const filterCategory = document.getElementById('filter-category');

// モーダル要素
const recipeModal = document.getElementById('recipe-modal');
const modalClose = document.getElementById('modal-close');
const modalImage = document.getElementById('modal-image');
const modalCategory = document.getElementById('modal-category');
const modalTitle = document.getElementById('modal-title');
const modalIngredients = document.getElementById('modal-ingredients');
const modalInstructions = document.getElementById('modal-instructions');

// 食材の入力行を追加する関数
function createIngredientRow(name = '', amount = '') {
  const row = document.createElement('div');
  row.className = 'ingredient-row';
  row.innerHTML = `
    <input type="text" class="ing-name" placeholder="食材名 (例: にんじん)" value="${name}" required>
    <input type="text" class="ing-amount" placeholder="分量 (例: 1本 / 100g)" value="${amount}">
    <button type="button" class="remove-ing-btn">&times;</button>
  `;

  row.querySelector('.remove-ing-btn').addEventListener('click', () => {
    // 枠が最低1つ残るようにする
    if (ingredientsList.children.length > 1) {
      row.remove();
    }
  });

  ingredientsList.appendChild(row);
}

// 初期入力行の準備
function resetIngredientInputs() {
  ingredientsList.innerHTML = '';
  createIngredientRow(); // 空の入力行を1つ配置
}

addIngredientBtn.addEventListener('click', () => createIngredientRow());

// レシピ描画
function renderRecipes() {
  const keyword = searchKeyword.value.toLowerCase().trim();
  const category = filterCategory.value;

  recipeList.innerHTML = '';

  const filtered = recipes.filter(recipe => {
    const matchesKeyword = recipe.title.toLowerCase().includes(keyword) ||
      recipe.ingredients.some(ing => ing.name.toLowerCase().includes(keyword));
    const matchesCategory = category === 'all' || recipe.category === category;

    return matchesKeyword && matchesCategory;
  });

  if (filtered.length === 0) {
    recipeList.innerHTML = '<p style="grid-column: 1/-1;">該当するレシピが見つかりません。</p>';
    return;
  }

  filtered.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    const defaultImg = 'https://via.placeholder.com/300x150?text=No+Image';
    const imageUrl = recipe.imageUrl ? recipe.imageUrl : defaultImg;

    card.innerHTML = `
      <img src="${imageUrl}" alt="${recipe.title}" onerror="this.src='${defaultImg}'">
      <div class="recipe-card-content">
        <span class="badge">${recipe.category}</span>
        <h3>${recipe.title}</h3>
        <p style="font-size: 12px; color: #666;">
          <strong>食材:</strong> ${recipe.ingredients.map(i => i.name).join(', ')}
        </p>
        <div class="card-actions">
          <button class="edit-btn">編集</button>
          <button class="delete-btn">削除</button>
        </div>
      </div>
    `;

    // カードクリックでモーダルを開く（編集・削除ボタンクリック時は開かない）
    card.addEventListener('click', (e) => {
      if (!e.target.classList.contains('edit-btn') && !e.target.classList.contains('delete-btn')) {
        openModal(recipe);
      }
    });

    // 編集ボタン
    card.querySelector('.edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      editRecipe(recipe);
    });

    // 削除ボタン
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteRecipe(recipe.id);
    });

    recipeList.appendChild(card);
  });
}

// レシピの追加・更新処理
recipeForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const id = recipeIdInput.value;
  const title = document.getElementById('title').value;
  const category = document.getElementById('category').value;
  const imageUrl = document.getElementById('image-url').value;
  const instructions = document.getElementById('instructions').value;

  // 食材リストの取得
  const ingRows = ingredientsList.querySelectorAll('.ingredient-row');
  const ingredients = Array.from(ingRows).map(row => {
    return {
      name: row.querySelector('.ing-name').value.trim(),
      amount: row.querySelector('.ing-amount').value.trim()
    };
  }).filter(ing => ing.name !== '');

  if (id) {
    // 既存レシピの修正（編集）
    const index = recipes.findIndex(r => r.id === Number(id));
    if (index !== -1) {
      recipes[index] = { id: Number(id), title, category, ingredients, imageUrl, instructions };
    }
  } else {
    // 新規作成
    const newRecipe = {
      id: Date.now(),
      title,
      category,
      ingredients,
      imageUrl,
      instructions
    };
    recipes.push(newRecipe);
  }

  localStorage.setItem('my_recipes', JSON.stringify(recipes));
  resetForm();
  renderRecipes();
});

// レシピ編集準備
function editRecipe(recipe) {
  formTitle.textContent = 'レシピの編集';
  submitBtn.textContent = '変更を保存';
  cancelBtn.style.display = 'inline-block';

  recipeIdInput.value = recipe.id;
  document.getElementById('title').value = recipe.title;
  document.getElementById('category').value = recipe.category;
  document.getElementById('image-url').value = recipe.imageUrl || '';
  document.getElementById('instructions').value = recipe.instructions || '';

  // 食材行のセット
  ingredientsList.innerHTML = '';
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    recipe.ingredients.forEach(ing => createIngredientRow(ing.name, ing.amount));
  } else {
    createIngredientRow();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// フォームリセット
function resetForm() {
  recipeForm.reset();
  recipeIdInput.value = '';
  formTitle.textContent = '新規レシピ追加';
  submitBtn.textContent = 'レシピを保存';
  cancelBtn.style.display = 'none';
  resetIngredientInputs();
}

cancelBtn.addEventListener('click', resetForm);

// 削除処理
function deleteRecipe(id) {
  if (confirm('このレシピを削除しますか？')) {
    recipes = recipes.filter(r => r.id !== id);
    localStorage.setItem('my_recipes', JSON.stringify(recipes));
    renderRecipes();
  }
}

// モーダル表示
function openModal(recipe) {
  const defaultImg = 'https://via.placeholder.com/600x300?text=No+Image';
  modalImage.src = recipe.imageUrl ? recipe.imageUrl : defaultImg;
  modalCategory.textContent = recipe.category;
  modalTitle.textContent = recipe.title;

  modalIngredients.innerHTML = recipe.ingredients
    .map(ing => `<li><span>${ing.name}</span><strong>${ing.amount}</strong></li>`)
    .join('');

  modalInstructions.textContent = recipe.instructions;
  recipeModal.style.display = 'flex';
}

// モーダル閉じる
modalClose.addEventListener('click', () => {
  recipeModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === recipeModal) {
    recipeModal.style.display = 'none';
  }
});

// イベントリスナー
searchKeyword.addEventListener('input', renderRecipes);
filterCategory.addEventListener('change', renderRecipes);

// 初期化
resetIngredientInputs();
renderRecipes();
