const PUBLIC_ITEM_FIELDS = "_id type itemName description category location roomNumber status createdAt";
function publicItem(item) {
  const result = {};
  for (const key of PUBLIC_ITEM_FIELDS.split(" ")) {
    if (item[key] !== undefined) result[key] = item[key];
  }
  return result;
}
module.exports = { PUBLIC_ITEM_FIELDS, publicItem };
