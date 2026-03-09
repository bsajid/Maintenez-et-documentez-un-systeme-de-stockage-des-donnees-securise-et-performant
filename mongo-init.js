// mongo-init.js
// -------------
// Ce script est exécuté automatiquement par MongoDB au premier démarrage.
// Il crée 3 utilisateurs avec 3 niveaux d'accès différents sur medical_db.

// UTILISATEUR 1 : root_admin
// Rôle : root (superadmin)
// Peut tout faire sur toutes les bases


// On se place dans la base medical_db pour les 2 autres comptes
db = db.getSiblingDB("medical_db");

// UTILISATEUR 2 : read_write_user
// Rôle : readWrite + dbAdmin sur medical_db uniquement
// Peut : lire, écrire, créer des index
// Ne peut pas : accéder aux autres bases, supprimer la base
// Utilisé par : le script de migration

db.createUser({
  user: process.env.MONGO_RW_USER || "read_write_user",
  pwd:  process.env.MONGO_RW_PASS || "ReadWritePassword456!",
  roles: [
    { role: "readWrite", db: "medical_db" },  // Lire et écrire les données
    { role: "dbAdmin",   db: "medical_db" },  // Créer les index
  ]
});
print("Utilisateur 'read_write_user' créé avec succès.");

// UTILISATEUR 3 : read_only_user
// Rôle : read sur medical_db uniquement
// Peut : lire les données
// Ne peut pas : écrire, modifier, supprimer quoi que ce soit
// Utilisé par : MongoDB Compass pour consulter les données

db.createUser({
  user: process.env.MONGO_RO_USER || "read_only_user",
  pwd:  process.env.MONGO_RO_PASS || "ReadOnlyPassword789!",
  roles: [
    { role: "read", db: "medical_db" },  // Lecture seule
  ]
});
print("Utilisateur 'read_only_user' créé avec succès.");
