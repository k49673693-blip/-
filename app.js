// 初期データ取得または空配列のセット
let recipes = JSON.parse(localStorage.getItem('my_recipes')) || [];

// DOM要素の取得
const recipeForm = document.getElementById('recipe-form');
const recipeList = document.getElementById('recipe-list');
const searchKeyword = document.getElementById('search-keyword');
const filterCategory = document.getElementById('filter-category');

// レシピ描画関数
function renderRecipes() {
  const keyword = searchKeyword.value.toLowerCase().trim();
  const category = filterCategory.value;

  recipeList.innerHTML = '';

  // フィルタリング処理（料理名・食材キーワード ＆ ジャンル）
  const filtered = recipes.filter(recipe => {
    const matchesKeyword = recipe.title.toLowerCase().includes(keyword) ||
                           recipe.ingredients.some(ing => ing.toLowerCase().includes(keyword));
    const matchesCategory = category === 'all' || recipe.category === category;

    return matchesKeyword && matchesCategory;
  });

  if (filtered.length === 0) {
    recipeList.innerHTML = '<p>該当するレシピが見つかりません。</p>';
    return;
  }

  // カード要素の作成
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
        <p class="ingredients-list"><strong>食材:</strong> ${recipe.ingredients.join(', ')}</p>
        <p style="font-size: 13px; white-space: pre-wrap;">${recipe.instructions}</p>
        <button class="delete-btn" onclick="deleteRecipe(${recipe.id})">削除</button>
      </div>
    `;
    recipeList.appendChild(card);
  });
}

// レシピ追加処理
recipeForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const title = document.getElementById('title').value;
  const ingredientsRaw = document.getElementById('ingredients').value;
  const category = document.getElementById('category').value;
  const imageUrl = document.getElementById('image-url').value;
  const instructions = document.getElementById('instructions').value;

  // カンマ区切りの食材を配列化
  const ingredients = ingredientsRaw.split(',').map(item => item.trim()).filter(item => item !== '');

  const newRecipe = {
    id: Date.now(),
    title,
    ingredients,
    category,
    imageUrl,
    instructions
  };

  recipes.push(newRecipe);
  localStorage.setItem('my_recipes', JSON.stringify(recipes));

  recipeForm.reset();
  renderRecipes();
});

// レシピ削除処理
function deleteRecipe(id) {
  if (confirm('このレシピを削除しますか？')) {
    recipes = recipes.filter(r => r.id !== id);
    localStorage.setItem('my_recipes', JSON.stringify(recipes));
    renderRecipes();
  }
}

// 検索・フィルターイベント Listener
searchKeyword.addEventListener('input', renderRecipes);
filterCategory.addEventListener('change', renderRecipes);

// 初期表示
renderRecipes();
