document.addEventListener('DOMContentLoaded', () => {
  let recipes = [];
  try {
    recipes = JSON.parse(localStorage.getItem('recipes')) || [];
  } catch (e) {
    recipes = [];
  }

  let currentImageData = '';

  // DOM要素
  const recipeForm = document.getElementById('recipe-form');
  const recipeIdInput = document.getElementById('recipe-id');
  const titleInput = document.getElementById('title');
  const categoryInput = document.getElementById('category');
  const ingredientsList = document.getElementById('ingredients-list');
  const stepsList = document.getElementById('steps-list');
  const addIngredientBtn = document.getElementById('add-ingredient-btn');
  const addStepBtn = document.getElementById('add-step-btn');

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

  // 食材行の追加
  function addIngredientRow(value = '') {
    const div = document.createElement('div');
    div.className = 'dynamic-row';
    div.innerHTML = `
      <input type="text" class="ingredient-input" placeholder="例: 人参 1本" value="${value}">
      <button type="button" class="btn-danger-sm remove-row-btn">削除</button>
    `;
    div.querySelector('.remove-row-btn').addEventListener('click', () => {
      div.remove();
    });
    ingredientsList.appendChild(div);
  }

  // 手順番号の自動更新
  function updateStepNumbers() {
    const stepRows = stepsList.querySelectorAll('.step-row');
    stepRows.forEach((row, index) => {
      const numSpan = row.querySelector('.step-number');
      if (numSpan) {
        numSpan.textContent = `手順${index + 1}:`;
      }
    });
  }

  // 作り方（手順）行の追加
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
      updateStepNumbers();
    });
    stepsList.appendChild(div);
    updateStepNumbers();
  }

  // ボタンイベント登録
  addIngredientBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addIngredientRow();
  });

  addStepBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addStepRow();
  });

  // 画像選択処理
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

  // レシピ保存
  recipeForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = recipeIdInput.value || Date.now().toString();
    const title = titleInput.value.trim();
    const category = categoryInput.value;

    const ingredients = Array.from(document.querySelectorAll('.ingredient-input'))
      .map(input => input.value.trim())
      .filter(val => val !== '');

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

    try {
      localStorage.setItem('recipes', JSON.stringify(recipes));
    } catch (err) {
      alert('画像サイズが大きすぎます。もう少し小さめの写真を選択してください。');
      return;
    }

    resetForm();
    renderRecipes();
  });

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

    addIngredientRow();
    addStepRow();
  }

  cancelBtn.addEventListener('click', resetForm);

  // レシピ描画
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

      const imgSrc = recipe.image || 'https://via.placeholder.com/300x200?text=No+Image';

      card.innerHTML = `
        <img src="${imgSrc}" class="card-img" alt="${recipe.title}">
        <div class="card-content">
          <span class="badge">${recipe.category}</span>
          <div class="card-title">${recipe.title}</div>
          <div class="card-actions">
            <button type="button" class="btn-edit">編集</button>
            <button type="button" class="btn-delete">削除</button>
          </div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit') || e.target.classList.contains('btn-delete')) {
          return;
        }
        openModal(recipe);
      });

      card.querySelector('.btn-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        loadRecipeToForm(recipe);
      });

      card.querySelector('.btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`「${recipe.title}」を削除してもよろしいですか？`)) {
          recipes = recipes.filter(r => r.id !== recipe.id);
          localStorage.setItem('recipes', JSON.stringify(recipes));
          renderRecipes();
        }
      });

      recipeListContainer.appendChild(card);
    });
  }

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

  searchKeyword.addEventListener('input', renderRecipes);
  filterCategory.addEventListener('change', renderRecipes);

  function openModal(recipe) {
    modalTitle.textContent = recipe.title;
    modalCategory.textContent = recipe.category;

    if (recipe.image) {
      modalImage.src = recipe.image;
      modalImage.style.display = 'block';
    } else {
      modalImage.style.display = 'none';
    }

    modalIngredients.innerHTML = '';
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      recipe.ingredients.forEach(ing => {
        const li = document.createElement('li');
        li.textContent = ing;
        modalIngredients.appendChild(li);
      });
    }

    modalSteps.innerHTML = '';
    if (recipe.steps && recipe.steps.length > 0) {
      recipe.steps.forEach(step => {
        const li = document.createElement('li');
        li.textContent = step;
        modalSteps.appendChild(li);
      });
    }

    if (recipe.memo) {
      modalMemo.textContent = recipe.memo;
      modalMemoContainer.style.display = 'block';
    } else {
      modalMemoContainer.style.display = 'none';
    }

    recipeModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    recipeModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  modalClose.addEventListener('click', closeModal);

  recipeModal.addEventListener('click', (e) => {
    if (e.target === recipeModal) {
      closeModal();
    }
  });

  // 初期化実行
  resetForm();
  renderRecipes();
});
