document.addEventListener('DOMContentLoaded', () => {
  let recipes = [];
  try {
    recipes = JSON.parse(localStorage.getItem('recipes')) || [];
  } catch (e) {
    recipes = [];
  }

  let currentImageData = '';
  let searchIngredientTags = []; // 検索用食材タグのリスト

  // DOM要素取得
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

  // 食材検索用DOM
  const ingredientSearchInput = document.getElementById('ingredient-search-input');
  const addIngredientFilterBtn = document.getElementById('add-ingredient-filter-btn');
  const ingredientTagsContainer = document.getElementById('ingredient-tags');

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

  // 食材行（名前・分量に分離）の追加
  function addIngredientRow(name = '', amount = '') {
    const div = document.createElement('div');
    div.className = 'dynamic-row';
    div.innerHTML = `
      <input type="text" class="ingredient-name-input" placeholder="食材名 (例: 人参)" value="${name}">
      <input type="text" class="ingredient-amount-input" placeholder="分量 (例: 1本)" value="${amount}">
      <button type="button" class="btn-danger-sm remove-row-btn">削除</button>
    `;
    div.querySelector('.remove-row-btn').addEventListener('click', () => {
      div.remove();
    });
    ingredientsList.appendChild(div);
  }

  // 手順番号の自動計算
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

  // 画像アップロード処理
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

  // レシピ保存処理
  recipeForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = recipeIdInput.value || Date.now().toString();
    const title = titleInput.value.trim();
    const category = categoryInput.value;

    // 食材入力データ取得 ({ name, amount })
    const ingredientRows = ingredientsList.querySelectorAll('.dynamic-row');
    const ingredients = [];
    ingredientRows.forEach(row => {
      const name = row.querySelector('.ingredient-name-input').value.trim();
      const amount = row.querySelector('.ingredient-amount-input').value.trim();
      if (name !== '' || amount !== '') {
        ingredients.push({ name, amount });
      }
    });

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

  // 食材検索用タグの追加・描画処理
  function addIngredientFilterTag() {
    const val = ingredientSearchInput.value.trim();
    if (val !== '' && !searchIngredientTags.includes(val)) {
      searchIngredientTags.push(val);
      ingredientSearchInput.value = '';
      renderIngredientTags();
      renderRecipes();
    }
  }

  function renderIngredientTags() {
    ingredientTagsContainer.innerHTML = '';
    searchIngredientTags.forEach(tag => {
      const tagEl = document.createElement('span');
      tagEl.className = 'ingredient-tag';
      tagEl.innerHTML = `
        ${tag}
        <span class="remove-tag">&times;</span>
      `;
      tagEl.querySelector('.remove-tag').addEventListener('click', () => {
        searchIngredientTags = searchIngredientTags.filter(t => t !== tag);
        renderIngredientTags();
        renderRecipes();
      });
      ingredientTagsContainer.appendChild(tagEl);
    });
  }

  addIngredientFilterBtn.addEventListener('click', addIngredientFilterTag);
  ingredientSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addIngredientFilterTag();
    }
  });

  // レシピ描画 & 絞り込み
  function renderRecipes() {
    recipeListContainer.innerHTML = '';

    const keyword = searchKeyword.value.toLowerCase();
    const selectedCategory = filterCategory.value;

    const filtered = recipes.filter(r => {
      // 1. 料理名キーワード検索
      const matchesKeyword = r.title.toLowerCase().includes(keyword);

      // 2. ジャンル絞り込み
      const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;

      // 3. 複数食材タグでのAND絞り込み（指定された食材タグがすべてレシピに含まれているか）
      const matchesIngredients = searchIngredientTags.every(tag => {
        const tagLower = tag.toLowerCase();
        return r.ingredients.some(ing => {
          if (typeof ing === 'string') {
            return ing.toLowerCase().includes(tagLower);
          } else if (ing && ing.name) {
            return ing.name.toLowerCase().includes(tagLower);
          }
          return false;
        });
      });

      return matchesKeyword && matchesCategory && matchesIngredients;
    });

    if (filtered.length === 0) {
      recipeListContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #777;">該当するレシピが見つかりません</p>';
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

  // 編集データのロード
  function loadRecipeToForm(recipe) {
    recipeIdInput.value = recipe.id;
    titleInput.value = recipe.title;
    categoryInput.value = recipe.category;
    memoInput.value = recipe.memo || '';

    ingredientsList.innerHTML = '';
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      recipe.ingredients.forEach(i => {
        if (typeof i === 'string') {
          addIngredientRow(i, '');
        } else {
          addIngredientRow(i.name || '', i.amount || '');
        }
      });
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

  // 全画面モーダル表示
  function openModal(recipe) {
    modalTitle.textContent = recipe.title;
    modalCategory.textContent = recipe.category;

    if (recipe.image) {
      modalImage.src = recipe.image;
      modalImage.style.display = 'block';
    } else {
      modalImage.style.display = 'none';
    }

    // 食材表示の成形
    modalIngredients.innerHTML = '';
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      recipe.ingredients.forEach(ing => {
        const li = document.createElement('li');
        if (typeof ing === 'string') {
          li.innerHTML = `<span class="ing-name">${ing}</span>`;
        } else {
          li.innerHTML = `
            <span class="ing-name">${ing.name}</span>
            <span class="ing-amount">${ing.amount}</span>
          `;
        }
        modalIngredients.appendChild(li);
      });
    }

    // 手順の表示
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
